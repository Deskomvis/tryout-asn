import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIE_API_URL = "https://api.kie.ai/claude/v1/messages";
const MODEL = "claude-sonnet-4-6";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `Kamu adalah parser soal ujian CPNS/PPPK Indonesia yang sangat teliti.
Tugasmu: Ekstrak SEMUA soal dari teks yang diberikan PERSIS seperti tertulis di sumber aslinya.

Format output: JSONL (satu objek JSON per baris, tanpa markdown code block).
Field wajib setiap objek:
- question_text  : string — teks pertanyaan lengkap (tanpa nomor soal di depan)
- options        : string[] — array pilihan jawaban (tanpa awalan "A." "B." "C." "D." "E.")
- correct_answer : string — teks jawaban benar (harus SAMA PERSIS dengan salah satu elemen options)
- subtest        : "twk" | "tiu" | "tkp"
- topic          : string — topik singkat (cth: "pancasila", "analogi verbal", "pelayanan publik")
- explanation    : string — penjelasan singkat mengapa jawaban benar (kosong "" jika tidak ada di teks)
- option_points  : null (untuk TWK/TIU) | object (untuk TKP: {"<teks_opsi>": <skor 1–5>})

ATURAN EKSTRAKSI:
1. Output HANYA berupa baris-baris JSONL yang valid — tidak ada teks pengantar, penutup, atau komentar
2. Jangan buat/generate soal baru — HANYA ekstrak soal yang BENAR-BENAR ADA dalam teks
3. Lewati soal yang tidak lengkap (pertanyaan tidak jelas, opsi kurang dari 2, atau jawaban benar tidak ada)
4. Pastikan correct_answer SAMA PERSIS (karakter per karakter) dengan salah satu item di options
5. Untuk soal TKP (Tes Karakteristik Pribadi / situasional):
   - option_points berisi penilaian sikap: skor 1-5 (5 = sikap terbaik)
   - correct_answer = opsi dengan skor tertinggi
6. Subtest deteksi otomatis berdasarkan konten:
   - TWK: Pancasila, UUD 1945, NKRI, sejarah kebangsaan, bela negara
   - TIU: logika, analogi, silogisme, matematika, deret angka, figural
   - TKP: situasi kerja, sikap ASN, pelayanan publik, etika, profesionalisme
7. Jika ada kunci jawaban di akhir teks (misal "1.B 2.A 3.D"), gunakan untuk menentukan correct_answer
8. Bersihkan artefak OCR: spasi berlebih, baris terputus, karakter aneh — rekonstruksi teks yang masuk akal`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResp({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return jsonResp({ error: "Unauthorized" }, 401);

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
  if (!roleRow) return jsonResp({ error: "Forbidden" }, 403);

  const body = await req.json();
  const { material_id, exam_id } = body as { material_id: string; exam_id: string };

  if (!material_id || !exam_id) return jsonResp({ error: "material_id dan exam_id wajib diisi" }, 400);

  // Fetch material text
  const { data: mat, error: matErr } = await supabase
    .from("materials")
    .select("title, extracted_text, category, topic")
    .eq("id", material_id)
    .single();
  if (matErr || !mat) return jsonResp({ error: "Materi tidak ditemukan" }, 404);

  const kieApiKey = Deno.env.get("KIE_API_KEY");
  if (!kieApiKey) return jsonResp({ error: "KIE_API_KEY belum dikonfigurasi" }, 500);

  // Verify exam exists
  const { data: exam } = await supabase.from("exams").select("id, total_questions").eq("id", exam_id).single();
  if (!exam) return jsonResp({ error: "Exam tidak ditemukan" }, 404);

  // Truncate text if too long (Claude context: use up to 60k chars ~ 15k tokens)
  const textLimit = 60000;
  const extractedText = mat.extracted_text.length > textLimit
    ? mat.extracted_text.slice(0, textLimit) + "\n[... teks terpotong karena terlalu panjang ...]"
    : mat.extracted_text;

  const categoryHint = mat.category && mat.category !== "general"
    ? `\nKategori materi ini: ${mat.category.toUpperCase()} — kemungkinan besar semua soal adalah subtest ${mat.category.toUpperCase()}.`
    : "";

  const userMsg = `Judul materi: "${mat.title}"${mat.topic ? ` — Topik: ${mat.topic}` : ""}${categoryHint}

Teks sumber (hasil ekstraksi PDF):
---
${extractedText}
---

Ekstrak semua soal dari teks di atas dalam format JSONL.`;

  // Call KIE API
  const apiRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": kieApiKey },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!apiRes.ok) {
    const errText = await apiRes.text();
    return jsonResp({ error: "KIE API error: " + errText.slice(0, 300) }, 500);
  }

  const apiData = await apiRes.json();
  const rawText: string = apiData.content?.[0]?.text ?? "";

  // Parse JSONL — handle markdown code blocks if Claude wraps output
  const cleaned = rawText.replace(/```jsonl?\n?/gi, "").replace(/```/g, "");
  const lines = cleaned.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const valid: any[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    if (!line.startsWith("{")) continue;
    try {
      const q = JSON.parse(line);
      if (
        typeof q.question_text !== "string" || q.question_text.length < 5 ||
        !Array.isArray(q.options) || q.options.length < 2 ||
        typeof q.correct_answer !== "string" ||
        !q.options.includes(q.correct_answer)
      ) {
        errors.push(`Skip: correct_answer tidak match opsi — "${q.correct_answer?.slice(0, 40)}"`);
        continue;
      }
      valid.push(q);
    } catch (e) {
      errors.push(`Parse error: ${line.slice(0, 80)}`);
    }
  }

  if (valid.length === 0) {
    return jsonResp({
      error: "Tidak ada soal yang berhasil diekstrak. Format PDF mungkin tidak standar atau teks sulit diparsing.",
      raw_preview: rawText.slice(0, 500),
      parse_errors: errors.slice(0, 5),
    }, 400);
  }

  // Bulk insert questions
  const { data: inserted, error: insertErr } = await supabase.from("questions").insert(
    valid.map((q) => ({
      exam_id: exam_id,
      question_text: q.question_text.trim(),
      options: q.options.map((o: string) => String(o).trim()),
      correct_answer: q.correct_answer.trim(),
      subtest: (["twk", "tiu", "tkp"].includes(q.subtest) ? q.subtest : "tiu") as string,
      topic: q.topic?.trim() || mat.topic || null,
      explanation: q.explanation?.trim() || null,
      option_points: q.option_points ?? null,
    }))
  ).select("id");

  if (insertErr) return jsonResp({ error: "DB insert error: " + insertErr.message }, 500);

  // Assign to exam via junction table
  const { count: existingCount } = await supabase
    .from("exam_question_assignments" as any)
    .select("*", { count: "exact", head: true })
    .eq("exam_id", exam_id);

  const startPos = existingCount ?? 0;
  const { error: aErr } = await supabase.from("exam_question_assignments" as any).insert(
    (inserted ?? []).map((q: any, i: number) => ({
      exam_id,
      question_id: q.id,
      position: startPos + i + 1,
    }))
  );
  if (aErr) console.error("Assignment insert error:", aErr.message);

  // Update total_questions
  const { count: total } = await supabase
    .from("exam_question_assignments" as any)
    .select("*", { count: "exact", head: true })
    .eq("exam_id", exam_id);
  await supabase.from("exams").update({ total_questions: total ?? 0 }).eq("id", exam_id);

  return jsonResp({
    count: valid.length,
    exam_id,
    skipped: errors.length,
    total_in_exam: total,
  });
});
