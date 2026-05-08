import { createClient } from "npm:@supabase/supabase-js@2";

const KIE_API_KEY = Deno.env.get("KIE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIE_API_URL = "https://api.kie.ai/claude/v1/messages";

const TWK_TOPICS: Record<string, string> = {
  pancasila: "Pancasila (nilai-nilai, sila, implementasi dalam kehidupan berbangsa)",
  uud1945: "UUD 1945 (pasal, amandemen, lembaga negara, hak dan kewajiban warga negara)",
  bhineka: "Bhinneka Tunggal Ika (semboyan, keberagaman, toleransi, persatuan dalam perbedaan)",
  nkri: "NKRI (bentuk negara, wilayah, otonomi daerah, bela negara)",
  bahasa: "Bahasa Indonesia (ejaan baku EYD/PUEBI, kosakata, tata bahasa resmi)",
};

const TIU_TOPICS: Record<string, string> = {
  analogi: "Analogi Verbal (hubungan kata, sinonim/antonim kontekstual, asosiasi makna)",
  silogisme: "Silogisme (premis mayor, premis minor, kesimpulan logis deduktif)",
  logika: "Logika Formal (implikasi, kontraposisi, negasi, pernyataan majemuk, modus ponens/tollens)",
  hitung: "Hitung Cepat (operasi pecahan, persentase, perbandingan, bunga, usia, jarak-waktu-kecepatan)",
  deret: "Deret Angka dan Huruf (pola aritmetika, geometri, Fibonacci, selisih berulang)",
  figural: "Figural / Spasial (rotasi bangun, bayangan cermin, pola matriks, kubus)",
};

const TKP_TOPICS: Record<string, string> = {
  pelayanan: "Pelayanan Publik (orientasi pelanggan, empati, komunikasi, penyelesaian keluhan)",
  jejaring: "Jejaring Kerja (kolaborasi tim, membangun relasi, kerjasama lintas unit)",
  sosial: "Sosial Budaya (adaptasi, toleransi, keberagaman lingkungan kerja, multikulturalisme)",
  profesionalisme: "Profesionalisme (tanggung jawab, kedisiplinan, inisiatif, penyelesaian tugas, etika kerja)",
  antiradikalisme: "Anti Radikalisme (identifikasi paham radikal, sikap terhadap provokasi, kesetiaan pada Pancasila)",
  tik: "Teknologi Informasi dan Komunikasi (literasi digital, keamanan data, penggunaan alat kerja digital)",
};

function buildSystemPrompt(subtest: string, topic: string, topicDesc: string): string {
  if (subtest === "tkp") {
    return `Kamu adalah pembuat soal ujian Tes Karakteristik Pribadi (TKP) SKD ASN Indonesia yang sangat ahli.
Topik: ${topicDesc}

Buat soal situasional dengan format JSONL: satu objek JSON per baris, tanpa komentar, tanpa markdown.
Setiap soal memiliki:
- "question_text": string — situasi/skenario kerja yang relevan dengan topik, kesulitan sesuai standar CPNS/PPPK
- "options": array 5 string — pilihan sikap/tindakan berbeda (A–E), masing-masing realistis
- "option_points": objek key=teks_opsi, value=poin 1–5 — SETIAP opsi harus punya poin unik 1,2,3,4,5 (tidak boleh ada yang sama)
  Poin 5 = sikap terbaik sesuai nilai ASN, poin 1 = sikap paling tidak sesuai
- "explanation": string — penjelasan singkat (2-3 kalimat) mengapa opsi dengan poin 5 adalah yang terbaik, jelaskan nilai ASN yang diterapkan

Aturan ketat:
- Kelima poin harus berbeda: {teks_opsi_tertentu: 5, teks_lain: 4, teks_lain: 3, teks_lain: 2, teks_lain: 1}
- Semua key di option_points HARUS sama persis (karakter for karakter) dengan elemen di "options"
- Soal harus variatif, tidak mengulang skenario yang sama
- Bahasa Indonesia formal, tidak ada typo
- Output HANYA JSONL murni, tidak ada teks lain di luar JSON`;
  }

  const scoringNote = subtest === "twk"
    ? "TWK: jawaban benar = 5 poin, salah/tidak dijawab = 0."
    : "TIU: jawaban benar = 5 poin, salah/tidak dijawab = 0.";

  return `Kamu adalah pembuat soal ujian SKD ASN Indonesia yang sangat ahli.
Subtes: ${subtest.toUpperCase()} — ${subtest === "twk" ? "Tes Wawasan Kebangsaan" : "Tes Intelegensia Umum"}
Topik: ${topicDesc}
${scoringNote}
Kesulitan: Sesuai standar CPNS dan PPPK Indonesia

Buat soal pilihan ganda dengan format JSONL: satu objek JSON per baris, tanpa komentar, tanpa markdown.
Setiap soal memiliki:
- "question_text": string — pertanyaan yang jelas dan sesuai topik
- "options": array 5 string — 5 pilihan jawaban (A–E), satu yang benar sisanya pengecoh yang masuk akal
- "correct_answer": string — teks yang PERSIS SAMA dengan salah satu elemen di "options"
- "explanation": string — penjelasan singkat (2-3 kalimat) mengapa jawaban tersebut benar dan pengecoh lainnya salah

Aturan ketat:
- "correct_answer" harus merupakan substring yang ada persis di array "options"
- Soal harus variatif, tidak mengulang pertanyaan yang sama
- Bahasa Indonesia formal, akurat secara fakta
- Untuk ${subtest === "twk" ? "TWK" : "TIU"}: pastikan ada satu jawaban yang jelas benar berdasarkan fakta/logika
- Explanation harus informatif dan membantu pembelajaran
- Output HANYA JSONL murni, tidak ada teks lain di luar JSON`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const { exam_id, subtest, topic, count } = body as {
      exam_id: string;
      subtest: "twk" | "tiu" | "tkp";
      topic: string;
      count: number;
    };

    if (!exam_id || !subtest || !topic || !count) {
      return json({ error: "exam_id, subtest, topic, count diperlukan" }, 400);
    }
    if (!["twk", "tiu", "tkp"].includes(subtest)) {
      return json({ error: "subtest harus twk, tiu, atau tkp" }, 400);
    }
    const safeCount = Math.max(1, Math.min(30, Number(count)));

    const topicMap = subtest === "twk" ? TWK_TOPICS : subtest === "tiu" ? TIU_TOPICS : TKP_TOPICS;
    const topicDesc = topicMap[topic] ?? topic;

    if (!KIE_API_KEY) {
      return json({ error: "KIE_API_KEY tidak konfigurasi" }, 500);
    }

    const apiResponse = await fetch(KIE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: `${buildSystemPrompt(subtest, topic, topicDesc)}\n\nBuat tepat ${safeCount} soal untuk topik: ${topicDesc}. Output harus berupa ${safeCount} baris JSONL, satu soal per baris. Setiap soal HARUS punya field 'explanation'.`,
        }],
        stream: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return json({ error: `KIE API error: ${apiResponse.status}`, details: errorData }, 500);
    }

    const response = await apiResponse.json();

    const content = response.content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((b) => b.type === "text");
    if (!textBlock || !textBlock.text) {
      return json({ error: "Tidak ada output dari AI" }, 500);
    }

    const rawText = textBlock.text.trim();
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("{"));

    const inserted: any[] = [];
    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) continue;

        const payload: any = {
          exam_id,
          question_text: q.question_text,
          options: q.options,
          subtest,
          explanation: q.explanation || "", // Pembahasan soal
        };

        if (subtest === "tkp") {
          if (!q.option_points || typeof q.option_points !== "object") continue;
          const pointValues = Object.values(q.option_points) as number[];
          const validPoints = new Set([1, 2, 3, 4, 5]);
          const allUnique = new Set(pointValues).size === pointValues.length;
          const allValid = pointValues.every((v) => validPoints.has(v));
          if (!allUnique || !allValid || pointValues.length !== 5) continue;
          payload.option_points = q.option_points;
          const bestOption = Object.entries(q.option_points as Record<string, number>)
            .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
          payload.correct_answer = bestOption;
        } else {
          if (!q.correct_answer || !q.options.includes(q.correct_answer)) continue;
          payload.correct_answer = q.correct_answer;
        }

        const { error: insertErr } = await supabase.from("questions").insert(payload);
        if (!insertErr) inserted.push(payload);
      } catch {
        // skip malformed lines
      }
    }

    if (inserted.length > 0) {
      const { count: currentCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", exam_id);
      await supabase.from("exams").update({ total_questions: currentCount ?? inserted.length }).eq("id", exam_id);
    }

    return json({ count: inserted.length, requested: safeCount });
  } catch (err: any) {
    return json({ error: err?.message ?? "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
