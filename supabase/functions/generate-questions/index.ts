import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIE_API_URL = "https://api.kie.ai/claude/v1/messages";
const MODEL = "claude-haiku-4-5";

const TWK_TOPICS: Record<string, string> = {
  nasionalisme: "Nasionalisme (mewujudkan kepentingan nasional melalui cita-cita dan tujuan yang sama dengan tetap mempertahankan identitas nasional)",
  bela_negara: "Bela Negara (peran aktif dalam mempertahankan eksistensi bangsa dan negara sebagai wujud cinta tanah air)",
  integritas: "Integritas (menjunjung tinggi kejujuran, ketangguhan, kewibawaan sebagai satu kesatuan)",
  pilar_negara: "Pilar Negara (Pancasila, UUD 1945, NKRI, dan Bhinneka Tunggal Ika sebagai fondasi bernegara)",
  bahasa: "Bahasa Indonesia (penggunaan bahasa Indonesia sebagai bahasa persatuan yang baik dan benar)",
};
const TIU_TOPICS: Record<string, string> = {
  analogi: "Analogi (kemampuan bernalar melalui perbandingan dua konsep kata yang memiliki hubungan tertentu)",
  silogisme: "Silogisme (menarik kesimpulan dari dua pernyataan atau premis yang diberikan secara logis)",
  analitis: "Penalaran Analitis (menganalisis informasi yang diberikan untuk menyimpulkan suatu kondisi tertentu)",
  hitung: "Hitung Cepat (operasi matematika dasar sederhana untuk melihat kecepatan berhitung)",
  deret: "Deret Angka (melihat pola hubungan angka-angka dalam suatu urutan)",
  kuantitatif: "Perbandingan Kuantitatif (menarik kesimpulan berdasarkan dua data kuantitatif/angka)",
  cerita: "Soal Cerita (menyelesaikan masalah matematika dalam konteks kehidupan sehari-hari)",
  figural_analogi: "Analogi Gambar (bernalar melalui perbandingan dua gambar yang memiliki hubungan tertentu)",
  figural_ketidaksamaan: "Ketidaksamaan Gambar (melihat perbedaan atau keanehan di antara beberapa gambar)",
  figural_serial: "Serial Gambar (melihat pola perubahan atau kelanjutan dari deretan gambar)",
};
const TKP_TOPICS: Record<string, string> = {
  pelayanan: "Pelayanan Publik (keramahtamahan dalam bekerja untuk memenuhi kebutuhan orang lain)",
  jejaring: "Jejaring Kerja (membangun dan membina hubungan, bekerja sama, berbagi informasi dan berkolaborasi)",
  sosial: "Sosial Budaya (adaptasi dan bekerja efektif dalam masyarakat majemuk)",
  profesionalisme: "Profesionalisme (melaksanakan tugas dan fungsi sesuai dengan tuntutan jabatan)",
  antiradikalisme: "Anti Radikalisme (menjaring informasi tentang pemahaman radikalisme dan sikap terhadapnya)",
  tik: "Teknologi Informasi dan Komunikasi (pemanfaatan teknologi informasi untuk meningkatkan kinerja)",
};

// Chart types supported for programmatic SVG generation
type ChartType = "bar" | "line" | "pie" | "table" | "none";

function buildSystemPrompt(subtest: string, topicDesc: string, chartType: ChartType, customInstruction?: string, materialText?: string, materialTitle?: string): string {
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

  const customNote = customInstruction
    ? `\nINSTRUKSI KHUSUS DARI ADMIN (prioritas tinggi, ikuti dengan seksama):\n${customInstruction}\n`
    : "";

  const materialNote = materialText
    ? `\nMATERI REFERENSI${materialTitle ? ` — ${materialTitle}` : ""}:\n"""\n${materialText.slice(0, 6000)}${materialText.length > 6000 ? "\n[... terpotong]" : ""}\n"""\nBuat soal yang BERSUMBER dari materi referensi di atas. Gunakan fakta, angka, pasal, atau konsep yang ada dalam materi tersebut.\n`
    : "";

  if (subtest === "tkp") {
    return `You are a JSON generator. Output ONLY a raw JSON array. No prose, no explanation, no markdown, no code fences. Start your response with [ and end with ].

Generate Indonesian ASN TKP (Tes Karakteristik Pribadi) exam questions.
Topic: ${topicDesc}
${materialNote}${chartInstructions}${customNote}
Each object in the array MUST have exactly these fields:
- "question_text": situational scenario string
- "options": array of exactly 5 strings (attitude choices)
- "option_points": object mapping each option string to a unique integer 1-5 (each of 1,2,3,4,5 used exactly once)
- "explanation": 2-3 sentence string explaining why the option with 5 points is best${hasChart ? '\n- "chart_data": chart data object as specified above' : ""}

CRITICAL: Keys in option_points must be identical to strings in options. Output ONLY the JSON array.`;
  }

  const label = subtest === "twk" ? "TWK (Tes Wawasan Kebangsaan)" : "TIU (Tes Intelegensia Umum)";
  return `You are a JSON generator. Output ONLY a raw JSON array. No prose, no explanation, no markdown, no code fences. Start your response with [ and end with ].

Generate Indonesian ASN ${label} exam questions. Difficulty: appropriate for CPNS and PPPK standards.
Topic: ${topicDesc}
${materialNote}${chartInstructions}${customNote}
Each object in the array MUST have exactly these fields:
- "question_text": clear question string in Indonesian
- "options": array of exactly 5 strings (answer choices)
- "correct_answer": string that is EXACTLY one of the options strings
- "explanation": 2-3 sentence string in Indonesian explaining why the answer is correct${hasChart ? '\n- "chart_data": chart data object as specified above' : ""}

Output ONLY the JSON array starting with [.`;
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

// ─── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS });
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

    // ── Test connection mode ──────────────────────────────────────────────────
    if (body.action === "test_connection") {
      const testKey: string = body.api_key?.trim() ?? "";
      if (!testKey) return json({ success: false, message: "API key kosong" }, 400);

      const testRes = await fetch(KIE_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${testKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL, max_tokens: 5, stream: false,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (testRes.ok) {
        return json({ success: true, message: "Koneksi berhasil! API key valid." });
      }
      const errBody = await testRes.json().catch(() => ({})) as Record<string, unknown>;
      const errMsg = (errBody as any)?.error?.message ?? `HTTP ${testRes.status}`;
      return json({ success: false, message: `API key tidak valid: ${errMsg}` }, 400);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Read KIE API key (shared for all AI actions below) ───────────────────
    const { data: settingRowGlobal } = await supabase
      .from("admin_settings").select("value").eq("key", "kie_api_key").maybeSingle();
    const globalKieApiKey = settingRowGlobal?.value || Deno.env.get("KIE_API_KEY") || "";

    // ── Generate Single Question (for image question flow) ───────────────────
    if (body.action === "generate_single_question") {
      const { subtest, topic, custom_instruction } = body as {
        subtest: "twk" | "tiu" | "tkp";
        topic: string;
        custom_instruction?: string;
      };
      if (!globalKieApiKey) return json({ error: "KIE API key belum dikonfigurasi." }, 400);
      if (!subtest || !topic) return json({ error: "subtest dan topic diperlukan" }, 400);

      const topicMap = subtest === "twk" ? TWK_TOPICS : subtest === "tiu" ? TIU_TOPICS : TKP_TOPICS;
      const topicDesc = topicMap[topic] ?? topic;
      const isTkp = subtest === "tkp";
      const isFigural = ["figural_analogi", "figural_ketidaksamaan", "figural_serial"].includes(topic);

      let sysPrompt: string;
      if (isFigural) {
        // For figural/visual topics: Claude generates text describing the visual pattern.
        // The actual SVG illustration will be generated in the next step.
        const figuralGuide: Record<string, string> = {
          figural_analogi: `Generate a figural analogy question. Describe shapes/figures using text labels (e.g., "Gambar A: segitiga besar menghadap kanan", "Gambar B: segitiga kecil menghadap kiri"). The question asks: gambar A : gambar B = gambar C : ?`,
          figural_ketidaksamaan: `Generate a figural odd-one-out question. Describe 5 figures using text (e.g., shapes, rotations, symmetry). One figure is different from the rest.`,
          figural_serial: `Generate a figural series question. Describe a sequence of 4 figures that follow a visual pattern (e.g., rotation, addition/removal of elements, size change). The 5th is missing.`,
        };
        sysPrompt = `You are a JSON generator for Indonesian CPNS TIU ${topicDesc} exam questions.
This question will be paired with an SVG illustration generated afterward — so describe visual elements clearly in text.
Output ONLY a single valid JSON object. No prose, no markdown, no code fences.

${figuralGuide[topic] ?? ""}
${custom_instruction ? `\nCustom instruction: ${custom_instruction}` : ""}

Output a JSON object with exactly:
- "question_text": question string in Indonesian (describe figures/shapes textually, e.g. "Perhatikan pola gambar berikut: ...")
- "options": array of exactly 5 strings — describe each answer choice as a shape/figure description (e.g. "Segitiga besar menghadap kiri")
- "correct_answer": string EXACTLY matching one of the options
- "explanation": 2-3 sentences in Indonesian explaining the visual pattern and why the answer is correct
- "svg_prompt": precise description for SVG generator (e.g. "4 boxes in a row: large triangle right, small triangle left, large circle right, small circle left. 5th box empty = small circle right")

Output ONLY the JSON object.`;
      } else if (isTkp) {
        sysPrompt = `You are a JSON generator for Indonesian CPNS exam questions. Output ONLY a single valid JSON object. No prose, no markdown, no code fences.

Generate ONE TKP (Tes Karakteristik Pribadi) question about: ${topicDesc}

Output a JSON object with exactly:
- "question_text": situational scenario string (in Indonesian)
- "options": array of exactly 5 strings (attitude choices)
- "option_points": object mapping each option string to a unique integer 1-5 (each of 1,2,3,4,5 used exactly once, keys must match options exactly)
- "correct_answer": the option string with the highest points
- "explanation": 2-3 sentence explanation of why highest-point option is best
- "svg_prompt": "none"

Output ONLY the JSON object.`;
      } else {
        sysPrompt = `You are a JSON generator for Indonesian CPNS exam questions. Output ONLY a single valid JSON object. No prose, no markdown, no code fences.

Generate ONE ${subtest.toUpperCase()} question about: ${topicDesc}
${custom_instruction ? `\nCustom instruction: ${custom_instruction}` : ""}

Output a JSON object with exactly:
- "question_text": clear question string in Indonesian
- "options": array of exactly 5 strings (answer choices)
- "correct_answer": string EXACTLY matching one of the options
- "explanation": 2-3 sentence explanation in Indonesian
- "svg_prompt": one-sentence description for an SVG illustration (e.g. "a number line showing 3,6,12,24,?" or "none" if not visual)

Output ONLY the JSON object.`;
      }

      const res = await fetch(KIE_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${globalKieApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sysPrompt, messages: [{ role: "user", content: "Generate the question now." }], stream: false }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return json({ error: `KIE API error ${res.status}: ${errText.slice(0, 200)}` }, 500);
      }
      const resData = await res.json();
      if (resData?.type === "error" || resData?.error) {
        return json({ error: resData?.error?.message ?? "KIE API error" }, 500);
      }
      const rawText = (resData.content as Array<{ type: string; text?: string }>)?.find(b => b.type === "text")?.text ?? "";
      const objStart = rawText.indexOf("{");
      const objEnd = rawText.lastIndexOf("}");
      if (objStart === -1 || objEnd <= objStart) return json({ error: `AI tidak mengembalikan JSON yang valid. Preview: ${rawText.slice(0, 100)}` }, 500);
      try {
        const q = JSON.parse(rawText.slice(objStart, objEnd + 1));
        return json({ question: q });
      } catch {
        return json({ error: "Gagal parse JSON dari AI" }, 500);
      }
    }

    // ── Generate SVG Illustration via Claude ─────────────────────────────────
    if (body.action === "generate_svg_illustration") {
      const { question_text, options, svg_prompt } = body as {
        question_text: string;
        options: string[];
        svg_prompt?: string;
      };
      if (!globalKieApiKey) return json({ error: "KIE API key belum dikonfigurasi." }, 400);
      if (!question_text) return json({ error: "question_text diperlukan" }, 400);

      const illustrationPrompt = svg_prompt && svg_prompt !== "none"
        ? `Illustration hint: ${svg_prompt}`
        : `Create a helpful educational diagram or visual for this question.`;

      const svgSysPrompt = `You are an SVG illustration generator for Indonesian CPNS exam questions.
Generate a clean, educational SVG illustration that visually represents the context of the exam question.
Output ONLY the raw SVG markup. Start your response with <svg and end with </svg>. No prose, no markdown, no code fences.

Rules:
- viewBox="0 0 520 300" width="520" height="300"  
- Background: white rect (fill="#ffffff")
- Colors: use #1E3A5F (dark navy), #3B82F6 (blue), #10B981 (green), #F59E0B (amber), #EF4444 (red), #F8FAFC (light gray)
- Font: font-family="system-ui, sans-serif"
- Include text labels, numbers, or data RELEVANT to the question
- If it's a number sequence/pattern: display the elements in boxes with visual pattern highlighted
- If it's a comparison/ratio problem: use bars or a table
- If it's a logical diagram: use labeled boxes and arrows
- If it's a geometry problem: draw the shape with dimensions labeled
- If it's a situational/TKP scenario: draw a simple workplace scene or flow diagram
- Make it self-explanatory — a student should understand what to look for
- Do NOT just draw decorative elements`;

      const userMsg = `Question: ${question_text}
Options: ${options?.join(", ")}
${illustrationPrompt}`;

      const res = await fetch(KIE_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${globalKieApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: svgSysPrompt, messages: [{ role: "user", content: userMsg }], stream: false }),
      });
      if (!res.ok) return json({ error: `KIE API error ${res.status}` }, 500);
      const resData = await res.json();
      const rawText = (resData.content as Array<{ type: string; text?: string }>)?.find(b => b.type === "text")?.text ?? "";
      const svgStart = rawText.indexOf("<svg");
      const svgEnd = rawText.lastIndexOf("</svg>");
      if (svgStart === -1 || svgEnd === -1) return json({ error: "AI tidak menghasilkan SVG yang valid" }, 500);
      const svgContent = rawText.slice(svgStart, svgEnd + 6);
      return json({ svg_content: svgContent });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const {
      exam_id, subtest, topic, count,
      chart_type = "none",
      image_url = null,
      custom_instruction = null,
      material_text = null,
      material_title = null,
    } = body as {
      exam_id?: string; subtest: "twk" | "tiu" | "tkp";
      topic: string; count: number;
      chart_type?: ChartType; image_url?: string | null;
      custom_instruction?: string | null;
      material_text?: string | null;
      material_title?: string | null;
    };

    if (!subtest || !topic || !count) {
      return json({ error: "subtest, topic, count diperlukan" }, 400);
    }
    if (!["twk", "tiu", "tkp"].includes(subtest)) {
      return json({ error: "subtest harus twk, tiu, atau tkp" }, 400);
    }
    const safeCount = Math.max(1, Math.min(30, Number(count)));

    // KIE API key already loaded above in globalKieApiKey
    const kieApiKey = globalKieApiKey;
    if (!kieApiKey) {
      return json({ error: "KIE API key belum dikonfigurasi. Masukkan di tab Pengaturan admin." }, 400);
    }


    const topicMap = subtest === "twk" ? TWK_TOPICS : subtest === "tiu" ? TIU_TOPICS : TKP_TOPICS;
    const topicDesc = topicMap[topic] ?? topic;
    const chartType: ChartType = ["bar", "line", "pie", "table"].includes(chart_type) ? chart_type as ChartType : "none";

    const systemPrompt = buildSystemPrompt(subtest, topicDesc, chartType, custom_instruction ?? undefined, material_text ?? undefined, material_title ?? undefined);
    const userMsg = `Generate exactly ${safeCount} question${safeCount > 1 ? "s" : ""}${chartType !== "none" ? ` with ${chartType} chart data` : ""} about: ${topicDesc}`;

    const userContent: unknown = (image_url && chartType === "none")
      ? [
          { type: "image", source: { type: "url", url: image_url } },
          { type: "text", text: userMsg + ". Questions must reference the image." },
        ]
      : userMsg;

    const messages: unknown[] = [{ role: "user", content: userContent }];

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

    const rawText = textBlock.text;

    // Extract JSON array: find first [ and last ] regardless of surrounding text/markdown
    let questionList: unknown[] = [];
    const arrStart = rawText.indexOf("[");
    const arrEnd = rawText.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        questionList = JSON.parse(rawText.slice(arrStart, arrEnd + 1));
      } catch { /* fall through to line extraction */ }
    }

    // Fallback: extract individual JSON objects from lines (JSONL)
    if (questionList.length === 0) {
      const lines = rawText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.startsWith("{"));
      for (const line of lines) {
        try {
          const trimmed = line.endsWith(",") ? line.slice(0, -1) : line;
          questionList.push(JSON.parse(trimmed));
        } catch { /* skip */ }
      }
    }

    if (questionList.length === 0) {
      return json({ error: `AI tidak mengembalikan JSON yang valid. Coba lagi. (Preview: ${rawText.slice(0, 150)})` }, 500);
    }

    const inserted: string[] = [];

    for (const item of questionList) {
      try {
        const q = item as Record<string, unknown>;
        if (!q.question_text || !Array.isArray(q.options) || (q.options as unknown[]).length < 2) continue;

        // Build SVG from chart_data if present
        let svgContent: string | null = null;
        if (q.chart_data && typeof q.chart_data === "object") {
          svgContent = buildSVGFromChartData(q.chart_data as Record<string, unknown>);
        }

        const payload: Record<string, unknown> = {
          exam_id: exam_id ?? null,
          question_text: q.question_text,
          options: q.options,
          subtest,
          explanation: q.explanation || "",
          image_url: image_url || null,
          svg_content: svgContent,
          source: "ai",
        };

        if (subtest === "tkp") {
          if (!q.option_points || typeof q.option_points !== "object") continue;
          const pointVals = Object.values(q.option_points as Record<string, number>);
          if (new Set(pointVals).size !== 5 || !pointVals.every((v) => [1,2,3,4,5].includes(Number(v)))) continue;
          payload.option_points = q.option_points;
          payload.correct_answer = Object.entries(q.option_points as Record<string, number>)
            .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        } else {
          const opts = q.options as string[];
          if (!q.correct_answer || !opts.includes(q.correct_answer as string)) continue;
          payload.correct_answer = q.correct_answer;
        }

        const { error: insertErr } = await supabase.from("questions").insert(payload);
        if (!insertErr) inserted.push(q.question_text as string);
      } catch { /* skip malformed */ }
    }

    if (inserted.length > 0 && exam_id) {
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
    headers: { "Content-Type": "application/json", ...CORS, ...extraHeaders },
  });
}
