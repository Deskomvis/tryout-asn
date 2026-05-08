import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIE_API_URL = "https://api.kie.ai/claude/v1/messages";
const MODEL = "claude-haiku-4-5";

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
  logika: "Logika Formal (implikasi, kontraposisi, negasi, pernyataan majemuk)",
  hitung: "Hitung Cepat (operasi pecahan, persentase, perbandingan, bunga, jarak-waktu)",
  deret: "Deret Angka dan Huruf (pola aritmetika, geometri, Fibonacci, selisih berulang)",
  figural: "Figural / Spasial (rotasi bangun, bayangan cermin, pola matriks)",
};
const TKP_TOPICS: Record<string, string> = {
  pelayanan: "Pelayanan Publik (orientasi pelanggan, empati, komunikasi, penyelesaian keluhan)",
  jejaring: "Jejaring Kerja (kolaborasi tim, membangun relasi, kerjasama lintas unit)",
  sosial: "Sosial Budaya (adaptasi, toleransi, keberagaman lingkungan kerja)",
  profesionalisme: "Profesionalisme (tanggung jawab, kedisiplinan, inisiatif, etika kerja)",
  antiradikalisme: "Anti Radikalisme (identifikasi paham radikal, kesetiaan pada Pancasila)",
  tik: "Teknologi Informasi dan Komunikasi (literasi digital, keamanan data)",
};

// Chart types supported for programmatic SVG generation
type ChartType = "bar" | "line" | "pie" | "table" | "none";

function buildSystemPrompt(subtest: string, topicDesc: string, chartType: ChartType): string {
  const hasChart = chartType !== "none";

  const chartInstructions = hasChart ? `
PENTING — MODE SOAL BERBASIS GRAFIK/CHART:
Soal harus merujuk pada sebuah grafik/data yang disertakan.
Tambahkan field "chart_data" dalam setiap objek JSON dengan format berikut tergantung tipe:

Tipe: "${chartType}"
${chartType === "bar" ? `"chart_data": {
  "type": "bar",
  "title": "Judul grafik",
  "labels": ["Label1","Label2","Label3","Label4","Label5"],
  "values": [angka1, angka2, angka3, angka4, angka5],
  "unit": "satuan (cth: juta jiwa, %, Rp miliar)",
  "color": "#4f6ef7"
}` : ""}${chartType === "line" ? `"chart_data": {
  "type": "line",
  "title": "Judul tren",
  "labels": ["2019","2020","2021","2022","2023"],
  "values": [angka1, angka2, angka3, angka4, angka5],
  "unit": "satuan",
  "color": "#22c55e"
}` : ""}${chartType === "pie" ? `"chart_data": {
  "type": "pie",
  "title": "Judul distribusi",
  "labels": ["Kategori A","Kategori B","Kategori C","Kategori D"],
  "values": [angka1, angka2, angka3, angka4],
  "colors": ["#4f6ef7","#22c55e","#f59e0b","#ef4444"]
}` : ""}${chartType === "table" ? `"chart_data": {
  "type": "table",
  "title": "Judul tabel",
  "headers": ["Kolom1","Kolom2","Kolom3","Kolom4"],
  "rows": [
    ["Data1","Data2","Data3","Data4"],
    ["Data5","Data6","Data7","Data8"],
    ["Data9","Data10","Data11","Data12"]
  ]
}` : ""}

Gunakan data yang REALISTIS dan RELEVAN dengan konteks Indonesia.
Dalam "question_text", tulis pertanyaan yang mengacu pada grafik, contoh:
"Berdasarkan grafik di atas, ..." atau "Perhatikan data pada tabel berikut. ..."
` : "";

  if (subtest === "tkp") {
    return `Kamu adalah pembuat soal TKP (Tes Karakteristik Pribadi) SKD ASN Indonesia.
Topik: ${topicDesc}
${chartInstructions}
Format output: JSONL — satu objek JSON per baris, HANYA JSON murni tanpa komentar.
Setiap soal WAJIB memiliki:
- "question_text": skenario situasional
- "options": array 5 string pilihan sikap
- "option_points": {teks_opsi: poin 1-5} — kelima nilai HARUS berbeda (1,2,3,4,5 masing-masing sekali)
- "explanation": penjelasan 2-3 kalimat mengapa opsi poin 5 terbaik${hasChart ? '\n- "chart_data": objek data grafik sesuai format di atas' : ""}

Key di option_points HARUS persis sama dengan teks di options. Output HANYA JSONL.`;
  }

  const label = subtest === "twk" ? "TWK (Tes Wawasan Kebangsaan)" : "TIU (Tes Intelegensia Umum)";
  return `Kamu adalah pembuat soal ${label} SKD ASN Indonesia.
Topik: ${topicDesc}
Kesulitan: sesuai standar CPNS dan PPPK Indonesia.
${chartInstructions}
Format output: JSONL — satu objek JSON per baris, HANYA JSON murni tanpa komentar.
Setiap soal WAJIB memiliki:
- "question_text": pertanyaan yang jelas
- "options": array 5 string pilihan jawaban
- "correct_answer": string PERSIS sama dengan salah satu elemen options
- "explanation": penjelasan 2-3 kalimat mengapa jawaban benar${hasChart ? '\n- "chart_data": objek data grafik sesuai format di atas' : ""}

Output HANYA JSONL.`;
}

// ─── SVG generators ──────────────────────────────────────────────────────────

function generateBarChartSVG(d: { title: string; labels: string[]; values: number[]; unit?: string; color?: string }): string {
  const W = 500, H = 280, PAD = { top: 40, right: 20, bottom: 60, left: 55 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const max = Math.max(...d.values) * 1.15;
  const barW = chartW / d.labels.length;
  const color = d.color ?? "#4f6ef7";
  const unit = d.unit ?? "";

  const bars = d.labels.map((label, i) => {
    const bh = (d.values[i] / max) * chartH;
    const x = PAD.left + i * barW + barW * 0.15;
    const y = PAD.top + chartH - bh;
    const bw = barW * 0.7;
    const shortLabel = label.length > 8 ? label.slice(0, 7) + "…" : label;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" rx="3"/>
<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#374151">${d.values[i].toLocaleString("id-ID")}</text>
<text x="${(x + bw / 2).toFixed(1)}" y="${(PAD.top + chartH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#6b7280">${shortLabel}</text>`;
  }).join("\n");

  // Y axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const val = max * r;
    const y = PAD.top + chartH - r * chartH;
    return `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${(PAD.left + chartW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
<text x="${(PAD.left - 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#9ca3af">${val.toFixed(0)}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:sans-serif;background:#fff;border-radius:8px">
<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${d.title}</text>
${unit ? `<text x="${PAD.left - 2}" y="${PAD.top - 8}" font-size="9" fill="#9ca3af">(${unit})</text>` : ""}
${ticks}
${bars}
<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1.5"/>
<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1.5"/>
</svg>`;
}

function generateLineChartSVG(d: { title: string; labels: string[]; values: number[]; unit?: string; color?: string }): string {
  const W = 500, H = 260, PAD = { top: 40, right: 20, bottom: 50, left: 55 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const max = Math.max(...d.values) * 1.15;
  const min = Math.min(...d.values) * 0.85;
  const range = max - min || 1;
  const color = d.color ?? "#22c55e";
  const unit = d.unit ?? "";

  const pts = d.labels.map((_, i) => {
    const x = PAD.left + (i / (d.labels.length - 1)) * chartW;
    const y = PAD.top + chartH - ((d.values[i] - min) / range) * chartH;
    return [x, y] as [number, number];
  });

  const polyline = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${PAD.left},${PAD.top + chartH} ${polyline} ${PAD.left + chartW},${PAD.top + chartH}`;

  const dots = pts.map(([x, y], i) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>
<text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-size="9" fill="#374151">${d.values[i]}</text>
<text x="${x.toFixed(1)}" y="${(PAD.top + chartH + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6b7280">${d.labels[i]}</text>`
  ).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:sans-serif;background:#fff;border-radius:8px">
<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${d.title}</text>
${unit ? `<text x="${PAD.left - 2}" y="${PAD.top - 8}" font-size="9" fill="#9ca3af">(${unit})</text>` : ""}
<polygon points="${area}" fill="${color}22"/>
<polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
${dots}
<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1.5"/>
<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1.5"/>
</svg>`;
}

function generatePieChartSVG(d: { title: string; labels: string[]; values: number[]; colors?: string[] }): string {
  const W = 500, H = 280, CX = 160, CY = 150, R = 110;
  const defaultColors = ["#4f6ef7", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const total = d.values.reduce((a, b) => a + b, 0);
  let angle = -Math.PI / 2;
  const slices = d.values.map((v, i) => {
    const sweep = (v / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const color = (d.colors ?? defaultColors)[i % defaultColors.length];
    const pct = ((v / total) * 100).toFixed(1);
    return `<path d="M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" stroke="#fff" stroke-width="2"/>
<text x="${(CX + (R * 0.65) * Math.cos(angle - sweep / 2)).toFixed(1)}" y="${(CY + (R * 0.65) * Math.sin(angle - sweep / 2)).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">${pct}%</text>`;
  }).join("\n");

  const legends = d.labels.map((label, i) => {
    const color = (d.colors ?? defaultColors)[i % defaultColors.length];
    const y = 80 + i * 22;
    return `<rect x="290" y="${y}" width="12" height="12" fill="${color}" rx="2"/>
<text x="308" y="${y + 10}" font-size="11" fill="#374151">${label} (${d.values[i].toLocaleString("id-ID")})</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:sans-serif;background:#fff;border-radius:8px">
<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${d.title}</text>
${slices}
${legends}
</svg>`;
}

function generateTableSVG(d: { title: string; headers: string[]; rows: string[][] }): string {
  const W = 520;
  const colW = (W - 40) / d.headers.length;
  const rowH = 28;
  const H = 40 + 32 + d.rows.length * rowH + 20;

  const headerCells = d.headers.map((h, i) =>
    `<rect x="${20 + i * colW}" y="40" width="${colW}" height="30" fill="#4f6ef7"/>
<text x="${(20 + i * colW + colW / 2).toFixed(1)}" y="60" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">${h}</text>`
  ).join("\n");

  const rowCells = d.rows.flatMap((row, ri) =>
    row.map((cell, ci) => {
      const y = 70 + ri * rowH;
      const bg = ri % 2 === 0 ? "#f9fafb" : "#fff";
      return `<rect x="${20 + ci * colW}" y="${y}" width="${colW}" height="${rowH}" fill="${bg}" stroke="#e5e7eb" stroke-width="0.5"/>
<text x="${(20 + ci * colW + colW / 2).toFixed(1)}" y="${(y + 18).toFixed(1)}" text-anchor="middle" font-size="10" fill="#374151">${cell}</text>`;
    })
  ).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family:sans-serif;background:#fff;border-radius:8px">
<text x="${W / 2}" y="26" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${d.title}</text>
${headerCells}
${rowCells}
</svg>`;
}

function buildSVGFromChartData(chartData: Record<string, unknown>): string | null {
  try {
    const type = chartData.type as string;
    if (type === "bar") return generateBarChartSVG(chartData as any);
    if (type === "line") return generateLineChartSVG(chartData as any);
    if (type === "pie") return generatePieChartSVG(chartData as any);
    if (type === "table") return generateTableSVG(chartData as any);
  } catch { /* skip invalid data */ }
  return null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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
    const {
      exam_id, subtest, topic, count,
      chart_type = "none",  // "bar" | "line" | "pie" | "table" | "none"
      image_url = null,     // for manually uploaded images
    } = body as {
      exam_id: string; subtest: "twk" | "tiu" | "tkp";
      topic: string; count: number;
      chart_type?: ChartType; image_url?: string | null;
    };

    if (!exam_id || !subtest || !topic || !count) {
      return json({ error: "exam_id, subtest, topic, count diperlukan" }, 400);
    }
    if (!["twk", "tiu", "tkp"].includes(subtest)) {
      return json({ error: "subtest harus twk, tiu, atau tkp" }, 400);
    }
    const safeCount = Math.max(1, Math.min(30, Number(count)));

    // Read KIE API key from admin_settings, fallback to env var
    const { data: settingRow } = await supabase
      .from("admin_settings").select("value").eq("key", "kie_api_key").maybeSingle();
    const kieApiKey = settingRow?.value || Deno.env.get("KIE_API_KEY") || "";
    if (!kieApiKey) {
      return json({ error: "KIE API key belum dikonfigurasi. Masukkan di tab Pengaturan admin." }, 400);
    }

    const topicMap = subtest === "twk" ? TWK_TOPICS : subtest === "tiu" ? TIU_TOPICS : TKP_TOPICS;
    const topicDesc = topicMap[topic] ?? topic;
    const chartType: ChartType = ["bar", "line", "pie", "table"].includes(chart_type) ? chart_type as ChartType : "none";

    const systemPrompt = buildSystemPrompt(subtest, topicDesc, chartType);
    const userMsg = `Buat tepat ${safeCount} soal${chartType !== "none" ? ` berbasis grafik (${chartType} chart)` : ""} untuk topik: ${topicDesc}. Output ${safeCount} baris JSONL, satu soal per baris. Setiap soal WAJIB punya semua field termasuk explanation${chartType !== "none" ? " dan chart_data" : ""}.`;

    const messages: unknown[] = [{ role: "user", content: userMsg }];

    // If admin provided an image, attach it for visual context
    if (image_url && chartType === "none") {
      messages[0] = {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: image_url } },
          { type: "text", text: userMsg + " Soal harus merujuk pada gambar yang disertakan." },
        ],
      };
    }

    const apiResponse = await fetch(KIE_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${kieApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: systemPrompt, messages, stream: false }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => "");
      return json({ error: `KIE API error ${apiResponse.status}: ${errorText.slice(0, 300)}` }, 500);
    }

    const response = await apiResponse.json();
    const textBlock = (response.content as Array<{ type: string; text?: string }>)?.find((b) => b.type === "text");
    if (!textBlock?.text) return json({ error: "Tidak ada output dari AI" }, 500);

    const lines = textBlock.text.trim().split("\n").map((l: string) => l.trim()).filter((l: string) => l.startsWith("{"));
    const inserted: string[] = [];

    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) continue;

        // Build SVG from chart_data if present
        let svgContent: string | null = null;
        if (q.chart_data && typeof q.chart_data === "object") {
          svgContent = buildSVGFromChartData(q.chart_data);
        }

        const payload: Record<string, unknown> = {
          exam_id,
          question_text: q.question_text,
          options: q.options,
          subtest,
          explanation: q.explanation || "",
          image_url: image_url || null,
          svg_content: svgContent,
        };

        if (subtest === "tkp") {
          if (!q.option_points || typeof q.option_points !== "object") continue;
          const pointVals = Object.values(q.option_points) as number[];
          if (new Set(pointVals).size !== 5 || !pointVals.every((v) => [1,2,3,4,5].includes(v))) continue;
          payload.option_points = q.option_points;
          payload.correct_answer = Object.entries(q.option_points as Record<string, number>)
            .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        } else {
          if (!q.correct_answer || !q.options.includes(q.correct_answer)) continue;
          payload.correct_answer = q.correct_answer;
        }

        const { error: insertErr } = await supabase.from("questions").insert(payload);
        if (!insertErr) inserted.push(q.question_text as string);
      } catch { /* skip malformed */ }
    }

    if (inserted.length > 0) {
      const { count: currentCount } = await supabase
        .from("questions").select("*", { count: "exact", head: true }).eq("exam_id", exam_id);
      await supabase.from("exams").update({ total_questions: currentCount ?? inserted.length }).eq("id", exam_id);
    }

    return json({ count: inserted.length, requested: safeCount });
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extraHeaders },
  });
}
