import { createClient } from "npm:@supabase/supabase-js@2";

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

function buildSystemPrompt(subtest: string, topic: string, topicDesc: string, withImage = false): string {
  const imageNote = withImage ? `
PENTING: Soal ini adalah soal BERBASIS GAMBAR. Buat soal yang MENGACU pada sebuah gambar/diagram/grafik.
Dalam "question_text", mulai dengan deskripsi singkat gambar dalam kurung siku, contoh:
"[Gambar menunjukkan grafik pertumbuhan ekonomi Indonesia 2019-2024] Berdasarkan grafik tersebut, ..."
atau
"[Ilustrasi struktur organisasi pemerintah daerah] Perhatikan gambar di samping. ..."
Soal harus dapat dipahami hanya dengan membaca teks (karena gambar akan ditampilkan terpisah).
` : "";

  if (subtest === "tkp") {
    return `Kamu adalah pembuat soal ujian Tes Karakteristik Pribadi (TKP) SKD ASN Indonesia yang sangat ahli.
Topik: ${topicDesc}
Kesulitan: Sesuai standar CPNS dan PPPK Indonesia
${imageNote}
Buat soal situasional dengan format JSONL: satu objek JSON per baris, tanpa komentar, tanpa markdown.
Setiap soal WAJIB memiliki semua field berikut:
- "question_text": string — situasi/skenario kerja yang relevan
- "options": array 5 string — pilihan sikap/tindakan berbeda, masing-masing realistis
- "option_points": objek key=teks_opsi, value=poin 1–5 (SETIAP opsi punya poin UNIK 1,2,3,4,5)
  Poin 5 = sikap terbaik sesuai nilai ASN, poin 1 = sikap paling tidak sesuai
- "explanation": string — penjelasan singkat (2-3 kalimat) mengapa opsi poin 5 adalah terbaik, jelaskan nilai ASN

Aturan ketat:
- Kelima poin harus berbeda: masing-masing 1, 2, 3, 4, dan 5 (satu set lengkap)
- Semua key di option_points HARUS persis sama (karakter demi karakter) dengan elemen di "options"
- Soal harus variatif, tidak mengulang skenario
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
${imageNote}
Buat soal pilihan ganda dengan format JSONL: satu objek JSON per baris, tanpa komentar, tanpa markdown.
Setiap soal WAJIB memiliki semua field berikut:
- "question_text": string — pertanyaan yang jelas dan sesuai topik
- "options": array 5 string — 5 pilihan jawaban, satu yang benar sisanya pengecoh masuk akal
- "correct_answer": string — teks yang PERSIS SAMA dengan salah satu elemen di "options"
- "explanation": string — penjelasan 2-3 kalimat mengapa jawaban benar dan pengecoh lainnya salah

Aturan ketat:
- "correct_answer" harus persis ada di array "options"
- Soal harus variatif, tidak mengulang pertanyaan
- Bahasa Indonesia formal, akurat secara fakta
- Explanation informatif dan membantu pembelajaran
- Output HANYA JSONL murni, tidak ada teks lain di luar JSON`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json(null, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { exam_id, subtest, topic, count, with_image, image_url } = body as {
      exam_id: string;
      subtest: "twk" | "tiu" | "tkp";
      topic: string;
      count: number;
      with_image?: boolean;
      image_url?: string;
    };

    if (!exam_id || !subtest || !topic || !count) {
      return json({ error: "exam_id, subtest, topic, count diperlukan" }, 400);
    }
    if (!["twk", "tiu", "tkp"].includes(subtest)) {
      return json({ error: "subtest harus twk, tiu, atau tkp" }, 400);
    }
    const safeCount = Math.max(1, Math.min(30, Number(count)));

    // Read KIE API key from admin_settings first, fallback to env var
    const { data: settingRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "kie_api_key")
      .maybeSingle();

    const kieApiKey = settingRow?.value || Deno.env.get("KIE_API_KEY") || "";
    if (!kieApiKey) {
      return json({ error: "KIE API key belum dikonfigurasi. Masukkan di halaman Pengaturan admin." }, 400);
    }

    const topicMap = subtest === "twk" ? TWK_TOPICS : subtest === "tiu" ? TIU_TOPICS : TKP_TOPICS;
    const topicDesc = topicMap[topic] ?? topic;

    const systemPrompt = buildSystemPrompt(subtest, topic, topicDesc, with_image && !image_url);

    const userMessage = image_url
      ? [
          { type: "text", text: `Buat tepat ${safeCount} soal BERBASIS GAMBAR untuk topik: ${topicDesc}. Soal harus merujuk pada gambar yang ditampilkan. Output harus berupa ${safeCount} baris JSONL, satu soal per baris. Setiap soal WAJIB punya semua field termasuk 'explanation'.` },
          { type: "image", source: { type: "url", url: image_url } },
        ]
      : `Buat tepat ${safeCount} soal untuk topik: ${topicDesc}. Output harus berupa ${safeCount} baris JSONL, satu soal per baris. Setiap soal WAJIB punya semua field termasuk 'explanation'.`;

    const apiResponse = await fetch(KIE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${kieApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: userMessage,
        }],
        stream: false,
        system: systemPrompt,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => "");
      return json({ error: `KIE API error ${apiResponse.status}: ${errorText.substring(0, 200)}` }, 500);
    }

    const response = await apiResponse.json();
    const content = response.content as Array<{ type: string; text?: string }>;
    const textBlock = content?.find((b) => b.type === "text");
    if (!textBlock?.text) {
      return json({ error: "Tidak ada output dari AI" }, 500);
    }

    const rawText = textBlock.text.trim();
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("{"));

    const inserted: string[] = [];
    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) continue;

        const payload: Record<string, unknown> = {
          exam_id,
          question_text: q.question_text,
          options: q.options,
          subtest,
          explanation: q.explanation || "",
          image_url: image_url || null,
        };

        if (subtest === "tkp") {
          if (!q.option_points || typeof q.option_points !== "object") continue;
          const pointValues = Object.values(q.option_points) as number[];
          const allUnique = new Set(pointValues).size === 5;
          const allValid = pointValues.every((v) => [1,2,3,4,5].includes(v));
          if (!allUnique || !allValid || pointValues.length !== 5) continue;
          payload.option_points = q.option_points;
          payload.correct_answer = Object.entries(q.option_points as Record<string, number>)
            .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        } else {
          if (!q.correct_answer || !q.options.includes(q.correct_answer)) continue;
          payload.correct_answer = q.correct_answer;
        }

        const { error: insertErr } = await supabase.from("questions").insert(payload);
        if (!insertErr) inserted.push(payload.question_text as string);
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}
