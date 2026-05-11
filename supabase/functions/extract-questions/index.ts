import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIE_API_URL = "https://api.kie.ai/claude/v1/messages";
const MODEL = "claude-haiku-4-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `Kamu adalah parser soal ujian CPNS/PPPK Indonesia.
Tugasmu: Ekstrak soal dari teks PERSIS seperti tertulis, DAN generate SVG untuk soal yang memiliki elemen visual (tabel data, pola angka, grafik).

Output: JSON array. Setiap elemen:
{
  "question_text": "teks pertanyaan (tanpa nomor soal)",
  "options": ["pilihan A", "pilihan B", "pilihan C", "pilihan D", "pilihan E"],
  "correct_answer": "teks jawaban benar (HARUS sama persis dengan salah satu elemen options)",
  "subtest": "twk|tiu|tkp",
  "topic": "topik singkat",
  "explanation": "penjelasan singkat (kosong jika tidak ada)",
  "svg_content": "SVG markup string atau null"
}

ATURAN EKSTRAKSI:
- Output HANYA JSON array yang valid, tidak ada teks lain
- Jangan buat soal baru — hanya ekstrak yang ada
- Lewati soal tidak lengkap atau jawaban tidak jelas
- correct_answer harus IDENTIK dengan salah satu elemen options (karakter per karakter)
- Hapus awalan "A." "B." "C." "D." "E." dari teks options
- subtest: twk (Pancasila/UUD/NKRI/sejarah), tiu (logika/analogi/hitung/figural/deret), tkp (situasi kerja/etika ASN)
- Jika ada kunci jawaban terpisah di akhir teks, gunakan untuk correct_answer
- Jika tidak ada soal yang bisa diekstrak, return array kosong []

ATURAN SVG (field svg_content):
Set null jika soal tidak butuh visual. Generate SVG jika teks mengandung data yang bisa divisualisasikan:

1. TABEL DATA — soal dengan baris/kolom data (statistik, perbandingan, frekuensi):
   - viewBox="0 0 520 240", background rect putih
   - Header baris/kolom: rect fill="#3B82F6" text fill="white" font-weight="bold"
   - Baris bergantian: fill="#F8FAFC" dan fill="#FFFFFF"
   - Border: stroke="#CBD5E1" stroke-width="1"
   - Padding sel: 8px, font-size="13" font-family="sans-serif" fill="#1E293B"

2. POLA / DERET ANGKA — soal deret atau figural dengan angka/simbol:
   - viewBox="0 0 520 120"
   - Setiap elemen dalam kotak: rect fill="#EFF6FF" stroke="#3B82F6" rx="6"
   - Angka di tengah: text font-size="18" font-weight="bold" fill="#1E40AF" text-anchor="middle"
   - Elemen tanda tanya: rect fill="#FFF7ED" stroke="#F97316", text fill="#EA580C"
   - Spasi antar kotak: 10px

3. GRAFIK BATANG — soal dengan data perbandingan antar kategori:
   - viewBox="0 0 520 280"
   - Area grafik: x=60 y=20 width=440 height=200
   - Batang: rect fill="#3B82F6" dengan lebar proporsional
   - Label kategori di bawah batang: font-size="12" fill="#475569"
   - Nilai di atas batang: font-size="11" fill="#1E293B"
   - Garis sumbu: stroke="#94A3B8" stroke-width="1"
   - Skala Y di kiri: 4-5 garis bantu horizontal stroke="#E2E8F0"

4. GRAFIK GARIS — soal dengan tren data waktu:
   - viewBox="0 0 520 280", area grafik sama dengan batang
   - Gunakan polyline stroke="#3B82F6" stroke-width="2.5" fill="none"
   - Titik data: circle fill="#3B82F6" r="4"
   - Label sumbu X/Y seperti grafik batang

JANGAN generate SVG jika:
- Soal hanya menyebut "perhatikan gambar berikut" tanpa ada data di teks
- Soal adalah teks murni tanpa referensi data visual
- Gambar yang dimaksud adalah foto/ilustrasi yang tidak bisa direpresentasikan sebagai data`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
  if (!roleRow) return json({ error: "Forbidden" }, 403);

  const body = await req.json();
  const { text_chunk, exam_id, category, topic } = body as {
    text_chunk: string;
    exam_id?: string;
    category?: string;
    topic?: string;
  };

  if (!text_chunk?.trim()) {
    return json({ error: "text_chunk wajib diisi" }, 400);
  }

  if (exam_id) {
    const { data: exam } = await supabase.from("exams").select("id").eq("id", exam_id).single();
    if (!exam) return json({ error: "Exam tidak ditemukan" }, 404);
  }

  const { data: settingRow } = await supabase
    .from("admin_settings").select("value").eq("key", "kie_api_key").maybeSingle();
  const kieApiKey = settingRow?.value || Deno.env.get("KIE_API_KEY") || "";
  if (!kieApiKey) return json({ error: "KIE API key belum dikonfigurasi" }, 400);

  const categoryHint = category && category !== "general"
    ? `\nSubtest dominan dalam teks ini: ${category.toUpperCase()}.`
    : "";

  const userMsg = `${topic ? `Topik: ${topic}\n` : ""}${categoryHint}

Teks sumber:
---
${text_chunk}
---

Ekstrak semua soal. Untuk setiap soal yang memiliki data tabel/pola/grafik dalam teks, generate svg_content yang sesuai. Return sebagai JSON array.`;

  const apiRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${kieApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      stream: false,
    }),
  });

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => "");
    return json({ error: `KIE API error ${apiRes.status}: ${errText.slice(0, 400)}` }, 500);
  }

  const apiData = await apiRes.json();

  if (apiData?.type === "error" || apiData?.error) {
    const msg = apiData?.error?.message ?? JSON.stringify(apiData?.error ?? apiData);
    return json({ error: `KIE error: ${msg}` }, 500);
  }

  const textBlock = (apiData.content as Array<{ type: string; text?: string }>)
    ?.find((b) => b.type === "text");
  const rawText = textBlock?.text ?? "";

  if (!rawText) return json({ count: 0, skipped: 0 });

  // Parse JSON array (strip markdown fences if present)
  const cleaned = rawText.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart === -1 || arrEnd <= arrStart) return json({ count: 0, skipped: 0 });

  let questionList: unknown[] = [];
  try {
    questionList = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
  } catch {
    return json({ count: 0, skipped: 0 });
  }

  if (!Array.isArray(questionList) || questionList.length === 0) {
    return json({ count: 0, skipped: 0 });
  }

  // Validate and normalise
  const valid: any[] = [];
  for (const q of questionList as any[]) {
    if (
      typeof q.question_text !== "string" || q.question_text.trim().length < 5 ||
      !Array.isArray(q.options) || q.options.length < 2 ||
      typeof q.correct_answer !== "string"
    ) continue;

    const opts = q.options.map((o: any) => String(o).trim());
    const ans = q.correct_answer.trim();
    if (!opts.includes(ans)) continue;

    // Validate svg_content: must be a non-empty string starting with '<' or null
    let svgContent: string | null = null;
    if (typeof q.svg_content === "string" && q.svg_content.trim().startsWith("<")) {
      svgContent = q.svg_content.trim();
    }

    valid.push({
      exam_id: exam_id ?? null,
      question_text: q.question_text.trim(),
      options: opts,
      correct_answer: ans,
      subtest: ["twk", "tiu", "tkp"].includes(q.subtest) ? q.subtest : "tiu",
      topic: q.topic?.trim() || topic || null,
      explanation: q.explanation?.trim() || null,
      svg_content: svgContent,
      option_points: null,
      source: "ai",
    });
  }

  if (valid.length === 0) return json({ count: 0, skipped: questionList.length });

  // Insert questions
  const { data: inserted, error: insertErr } = await supabase
    .from("questions").insert(valid).select("id");
  if (insertErr) return json({ error: "DB error: " + insertErr.message }, 500);

  if (exam_id && inserted && inserted.length > 0) {
    const { count: existingCount } = await supabase
      .from("exam_question_assignments")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", exam_id);

    const startPos = existingCount ?? 0;
    await supabase.from("exam_question_assignments").insert(
      (inserted ?? []).map((q: any, i: number) => ({
        exam_id,
        question_id: q.id,
        position: startPos + i + 1,
      }))
    );

    const { count: total } = await supabase
      .from("exam_question_assignments")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", exam_id);
    await supabase.from("exams").update({ total_questions: total ?? 0 }).eq("id", exam_id);
  }

  const withSvg = valid.filter((q) => q.svg_content !== null).length;
  return json({ count: valid.length, skipped: questionList.length - valid.length, with_svg: withSvg });
});
