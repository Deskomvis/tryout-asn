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

const SYSTEM_PROMPT = `Kamu adalah parser soal ujian CPNS/PPPK Indonesia yang sangat teliti.
Tugasmu: Ekstrak SEMUA soal dari teks yang diberikan PERSIS seperti tertulis di sumber aslinya.

Format output: JSON array (bukan JSONL). Output harus berupa satu array JSON yang valid.
Contoh format:
[
  {
    "question_text": "teks pertanyaan lengkap tanpa nomor soal",
    "options": ["pilihan A", "pilihan B", "pilihan C", "pilihan D", "pilihan E"],
    "correct_answer": "pilihan yang benar (sama persis dengan salah satu elemen options)",
    "subtest": "twk",
    "topic": "pancasila",
    "explanation": "penjelasan singkat mengapa jawaban benar (kosong jika tidak ada)"
  }
]

ATURAN:
1. Output HANYA berupa JSON array yang valid — tidak ada teks lain, tidak ada markdown
2. Jangan buat soal baru — HANYA ekstrak soal yang ADA dalam teks
3. Lewati soal yang tidak lengkap atau jawaban tidak jelas
4. correct_answer HARUS sama persis (karakter per karakter) dengan salah satu elemen di options
5. subtest: "twk" (kebangsaan/Pancasila/UUD), "tiu" (logika/analogi/hitung), atau "tkp" (situasi kerja/etika ASN)
6. Untuk TKP: correct_answer = opsi dengan sikap terbaik sebagai ASN
7. Jika ada kunci jawaban di akhir teks, gunakan untuk menentukan correct_answer
8. Bersihkan artefak OCR (spasi berlebih, baris terputus)
9. Hapus awalan "A." "B." "C." "D." "E." dari teks pilihan jawaban di options`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Verify auth
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
  if (!roleRow) return json({ error: "Forbidden" }, 403);

  const body = await req.json();
  const { material_id, exam_id } = body as { material_id: string; exam_id: string };
  if (!material_id || !exam_id) return json({ error: "material_id dan exam_id wajib diisi" }, 400);

  // Fetch material
  const { data: mat, error: matErr } = await supabase
    .from("materials").select("title, extracted_text, category, topic").eq("id", material_id).single();
  if (matErr || !mat) return json({ error: "Materi tidak ditemukan" }, 404);

  // Fetch exam
  const { data: exam } = await supabase.from("exams").select("id").eq("id", exam_id).single();
  if (!exam) return json({ error: "Exam tidak ditemukan" }, 404);

  // Get KIE API key from admin_settings (same as generate-questions)
  const { data: settingRow } = await supabase
    .from("admin_settings").select("value").eq("key", "kie_api_key").maybeSingle();
  const kieApiKey = settingRow?.value || Deno.env.get("KIE_API_KEY") || "";
  if (!kieApiKey) return json({ error: "KIE API key belum dikonfigurasi. Masukkan di tab Pengaturan." }, 400);

  // Truncate text (keep within reasonable token limit for haiku)
  const TEXT_LIMIT = 30000;
  const extractedText = mat.extracted_text.length > TEXT_LIMIT
    ? mat.extracted_text.slice(0, TEXT_LIMIT) + "\n[... teks terpotong]"
    : mat.extracted_text;

  const categoryHint = mat.category && mat.category !== "general"
    ? `\nKategori materi: ${mat.category.toUpperCase()} — kemungkinan besar semua soal adalah subtest ${mat.category.toUpperCase()}.`
    : "";

  const userMsg = `Judul materi: "${mat.title}"${mat.topic ? ` — Topik: ${mat.topic}` : ""}${categoryHint}

Teks sumber (hasil ekstraksi PDF):
---
${extractedText}
---

Ekstrak semua soal dari teks di atas. Return sebagai JSON array.`;

  // Call KIE API — same auth pattern as generate-questions
  const apiRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${kieApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
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
  const textBlock = (apiData.content as Array<{ type: string; text?: string }>)
    ?.find((b) => b.type === "text");
  const rawText = textBlock?.text ?? "";

  if (!rawText) return json({ error: "AI tidak menghasilkan output. Coba lagi." }, 500);

  // Parse JSON array — handle markdown code blocks
  const cleaned = rawText.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");

  if (arrStart === -1 || arrEnd <= arrStart) {
    return json({
      error: "AI tidak menghasilkan format yang bisa diparsing. Preview: " + rawText.slice(0, 300),
    }, 500);
  }

  let questionList: unknown[] = [];
  try {
    questionList = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
  } catch (e) {
    return json({ error: "Gagal parse JSON dari AI: " + String(e).slice(0, 200) }, 500);
  }

  if (!Array.isArray(questionList)) return json({ error: "Output AI bukan array" }, 500);

  // Validate + filter questions
  const valid: any[] = [];
  for (const q of questionList as any[]) {
    if (
      typeof q.question_text !== "string" || q.question_text.trim().length < 5 ||
      !Array.isArray(q.options) || q.options.length < 2 ||
      typeof q.correct_answer !== "string" ||
      !q.options.map((o: any) => String(o).trim()).includes(q.correct_answer.trim())
    ) continue;
    valid.push({
      exam_id,
      question_text: q.question_text.trim(),
      options: q.options.map((o: any) => String(o).trim()),
      correct_answer: q.correct_answer.trim(),
      subtest: ["twk", "tiu", "tkp"].includes(q.subtest) ? q.subtest : "tiu",
      topic: q.topic?.trim() || mat.topic || null,
      explanation: q.explanation?.trim() || null,
      option_points: null,
    });
  }

  if (valid.length === 0) {
    return json({
      error: `AI mengekstrak ${questionList.length} soal tapi tidak ada yang valid (correct_answer tidak cocok dengan options). Preview pertama: ` +
        JSON.stringify(questionList[0]).slice(0, 300),
    }, 400);
  }

  // Bulk insert questions
  const { data: inserted, error: insertErr } = await supabase.from("questions").insert(valid).select("id");
  if (insertErr) return json({ error: "DB error: " + insertErr.message }, 500);

  // Get current assignment count for position offset
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

  // Update total_questions
  const { count: total } = await supabase
    .from("exam_question_assignments")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", exam_id);
  await supabase.from("exams").update({ total_questions: total ?? 0 }).eq("id", exam_id);

  return json({ count: valid.length, skipped: questionList.length - valid.length, total_in_exam: total });
});
