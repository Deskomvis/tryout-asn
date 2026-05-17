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

const IMAGE_QUESTION_VARIANTS = [
  "matrix 3x3 with one missing cell",
  "sequence of numbered boxes with one missing item",
  "mini table with two or three rows of data",
  "flowchart with a missing step",
  "Venn-style relationship diagram",
  "number line or scale diagram",
  "bar comparison diagram",
  "calendar/time grid",
  "logic seating or ordering chart",
  "geometric pattern with rotation/reflection",
];

const TIU_IMAGE_GUIDES: Record<string, string> = {
  analogi: `Use visual analogy when possible: word-pair mapping, symbol-pair mapping, relationship arrows, or small comparison diagrams. Avoid only circles/squares.`,
  silogisme: `Use a Venn diagram, set relationship chart, or premise-conclusion boxes. The image should show the premises only, not the conclusion.`,
  analitis: `Use a logic grid, seating/order chart, schedule table, route map, or dependency diagram. One part can be unknown and answered from options.`,
  hitung: `Use a number line, weighing scale, simple transaction table, ratio bars, clock/time diagram, or measurement sketch.`,
  deret: `Use number/symbol sequences, tile patterns, alternating arithmetic/geometric patterns, or a 3x3 matrix with one missing cell.`,
  kuantitatif: `Use a mini table, bar comparison, proportion diagram, or two-column quantitative comparison. Include realistic numbers.`,
  cerita: `Use a compact situation diagram: distance route, work-rate timeline, container/volume sketch, price table, or schedule grid.`,
  figural_analogi: `Use varied figural analogy: arrows, rotations, shading changes, line counts, nested shapes, orientation, or fill patterns. Avoid repeating only circle/square size changes.`,
  figural_ketidaksamaan: `Use varied odd-one-out figures: symmetry, rotation, number of elements, line intersections, shading, position, or mirror direction.`,
  figural_serial: `Use varied serial figures: rotation, element addition/removal, alternating shading, position shifts, line count changes, or nested shape progression.`,
};

function pickImageVariant(topic: string) {
  const index = Math.abs(
    Array.from(`${topic}-${Date.now()}-${Math.random()}`).reduce((acc, char) => acc + char.charCodeAt(0), 0),
  ) % IMAGE_QUESTION_VARIANTS.length;
  return IMAGE_QUESTION_VARIANTS[index];
}

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
- "correct_answer": the option string with the highest score / 5 points
- "explanation": 2-3 sentence string explaining why the option with 5 points is best${hasChart ? '\n- "chart_data": chart data object as specified above' : ""}

IMPORTANT: Randomize the position of the high-scoring options. Do not always place the 5-point option in the same position.

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

IMPORTANT: Randomly distribute the correct answer among the 5 options.

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeOptionText(value: unknown): string {
  return String(value ?? "")
    .replace(/^[A-Z][.)]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const option of options) {
    const normalized = normalizeOptionText(option);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function resolveOptionFromChoices(options: string[], candidate: unknown): string | null {
  const rawCandidate = String(candidate ?? "").trim();
  if (/^[A-Z]$/i.test(rawCandidate)) {
    return options[rawCandidate.toUpperCase().charCodeAt(0) - 65] ?? null;
  }
  const normalizedCandidate = normalizeOptionText(candidate);
  if (!normalizedCandidate) return null;
  return options.find((option) => normalizeOptionText(option) === normalizedCandidate) ?? null;
}

function parsePointValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/[1-5]/);
    if (match) return Number(match[0]);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return parsePointValue(obj.point ?? obj.points ?? obj.score ?? obj.value ?? obj.nilai);
  }
  return null;
}

function buildFallbackTkpPoints(options: string[], bestAnswer: string): Record<string, number> {
  const wrongOptions = options.filter((option) => option !== bestAnswer);
  const scores = [4, 3, 2, 1];
  return {
    [bestAnswer]: 5,
    ...Object.fromEntries(wrongOptions.map((option, index) => [option, scores[index] ?? 1])),
  };
}

function normalizeTkpPointMap(
  options: string[],
  pointMap: Record<string, number>,
  explicitBestAnswer: string | null,
): Record<string, number> | null {
  const ranked = options.map((option, index) => ({
    option,
    index,
    score: Number.isFinite(pointMap[option]) ? pointMap[option] : null,
    preferred: option === explicitBestAnswer,
  }));

  const hasAnyScore = ranked.some((entry) => entry.score !== null);
  if (!hasAnyScore) {
    return explicitBestAnswer ? buildFallbackTkpPoints(options, explicitBestAnswer) : null;
  }

  ranked.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    const scoreA = a.score ?? Number.NEGATIVE_INFINITY;
    const scoreB = b.score ?? Number.NEGATIVE_INFINITY;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.index - b.index;
  });

  const normalized: Record<string, number> = {};
  const descending = [5, 4, 3, 2, 1];
  ranked.forEach((entry, index) => {
    normalized[entry.option] = descending[index] ?? Math.max(1, 5 - index);
  });
  return normalized;
}

function buildDistributedPositions(questionCount: number, optionCount: number): number[] {
  const positions: number[] = [];
  while (positions.length < questionCount) {
    const cycle = shuffleArray(Array.from({ length: optionCount }, (_, index) => index));
    for (const position of cycle) {
      if (positions.length >= questionCount) break;
      positions.push(position);
    }
  }
  return positions;
}

type PreparedQuestion = {
  question_text: string;
  options: string[];
  subtest: "twk" | "tiu" | "tkp";
  explanation: string;
  image_url: string | null;
  svg_content: string | null;
  source: "ai";
  exam_id: string | null;
  correct_answer: string;
  option_points?: Record<string, number>;
};

function prepareGeneratedQuestion({
  item,
  subtest,
  exam_id,
  image_url,
}: {
  item: unknown;
  subtest: "twk" | "tiu" | "tkp";
  exam_id?: string;
  image_url?: string | null;
}): PreparedQuestion | null {
  const q = item as Record<string, unknown>;
  if (typeof q.question_text !== "string") return null;

  const options = dedupeOptions(
    Array.isArray(q.options) ? q.options.map((option) => normalizeOptionText(option)) : [],
  );
  if (options.length < 2) return null;

  let svgContent: string | null = null;
  if (q.chart_data && typeof q.chart_data === "object") {
    svgContent = buildSVGFromChartData(q.chart_data as Record<string, unknown>);
  }

  const base: PreparedQuestion = {
    exam_id: exam_id ?? null,
    question_text: q.question_text.trim(),
    options,
    subtest,
    explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
    image_url: image_url || null,
    svg_content: svgContent,
    source: "ai",
    correct_answer: "",
  };

  if (!base.question_text) return null;

  if (subtest === "tkp") {
    const pointMap: Record<string, number> = {};
    const explicitBestAnswer = resolveOptionFromChoices(
      options,
      q.correct_answer ?? q.best_answer ?? q.answer ?? q.highest_answer,
    );

    // Handle array format: [5, 4, 3, 2, 1] — positional by option index
    if (!q.option_points && explicitBestAnswer) {
      Object.assign(pointMap, buildFallbackTkpPoints(options, explicitBestAnswer));
    } else if (!q.option_points) {
      return null;
    } else if (Array.isArray(q.option_points)) {
      const arr = q.option_points as unknown[];
      for (let i = 0; i < options.length; i++) {
        const val = parsePointValue(arr[i]);
        if (val === null) {
          console.error(`TKP array option_points: invalid value at index ${i}:`, arr[i]);
          return null;
        }
        pointMap[options[i]] = val;
      }
    } else if (typeof q.option_points === "object") {
      const rawPoints = q.option_points as Record<string, unknown>;
      const rawKeys = Object.keys(rawPoints);

      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const letter = String.fromCharCode(65 + i); // A, B, C, D, E

        // Strategy 1: normalized text match
        let rawKey = rawKeys.find(
          (key) => normalizeOptionText(key) === normalizeOptionText(option),
        );

        // Strategy 2: letter-only key (e.g. {"A": 5, "B": 4})
        if (!rawKey) {
          rawKey = rawKeys.find(
            (key) => key.trim().toUpperCase() === letter,
          );
        }

        // Strategy 3: positional fallback when key count matches option count
        if (!rawKey && rawKeys.length === options.length) {
          rawKey = rawKeys[i];
        }

        if (!rawKey) {
          console.error(
            `TKP validation failed: no key for option[${i}]="${option}" letter="${letter}"`,
            `rawKeys=[${rawKeys.join(", ")}]`,
          );
          return null;
        }

        const numericPoint = parsePointValue(rawPoints[rawKey]);
        if (numericPoint === null) {
          console.error(`TKP validation: non-numeric point for key "${rawKey}":`, rawPoints[rawKey]);
          return null;
        }
        pointMap[option] = numericPoint;
      }
    } else {
      console.error("TKP validation: option_points is not object or array:", typeof q.option_points);
      return null;
    }

    const normalizedPointMap = normalizeTkpPointMap(options, pointMap, explicitBestAnswer);
    if (!normalizedPointMap) {
      console.error("TKP validation: unable to normalize points", pointMap);
      return null;
    }

    const correctAnswer = Object.entries(normalizedPointMap).reduce((best, current) =>
      current[1] > best[1] ? current : best,
    )[0];

    return {
      ...base,
      option_points: normalizedPointMap,
      correct_answer: correctAnswer,
    };
  }

  const correctAnswer = resolveOptionFromChoices(options, q.correct_answer);
  if (!correctAnswer) return null;

  return {
    ...base,
    correct_answer: correctAnswer,
  };
}

function rebalanceCorrectAnswerPositions(questions: PreparedQuestion[]): PreparedQuestion[] {
  const grouped = new Map<number, PreparedQuestion[]>();
  for (const question of questions) {
    const bucket = grouped.get(question.options.length) ?? [];
    bucket.push(question);
    grouped.set(question.options.length, bucket);
  }

  const rebalanced: PreparedQuestion[] = [];
  for (const [, group] of grouped) {
    const positions = buildDistributedPositions(group.length, group[0].options.length);
    group.forEach((question, index) => {
      const wrongOptions = shuffleArray(
        question.options.filter((option) => option !== question.correct_answer),
      );
      const nextOptions = [...wrongOptions];
      nextOptions.splice(positions[index], 0, question.correct_answer);
      rebalanced.push({
        ...question,
        options: nextOptions,
      });
    });
  }

  return rebalanced;
}

// ─── Robust JSON object extractor ────────────────────────────────────────────
// Extracts individual { } objects from raw text using bracket counting.
// Works even if the enclosing array is truncated/cut off mid-stream.
function extractJsonObjects(text: string): unknown[] {
  const objects: unknown[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "{") { i++; continue; }
    let depth = 0;
    let inString = false;
    let escape = false;
    let j = i;
    while (j < text.length) {
      const c = text[j];
      if (escape) { escape = false; j++; continue; }
      if (c === "\\" && inString) { escape = true; j++; continue; }
      if (c === '"') { inString = !inString; j++; continue; }
      if (!inString) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            try { objects.push(JSON.parse(text.slice(i, j + 1))); } catch { /* skip malformed */ }
            i = j + 1;
            break;
          }
        }
      }
      j++;
    }
    if (depth > 0) break; // truncated — stop scanning
  }
  return objects;
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
      const imageVariant = pickImageVariant(topic);
      const tiuImageGuide = TIU_IMAGE_GUIDES[topic] ?? `Use a relevant TIU visual stimulus such as a table, diagram, grid, chart, sequence, or map.`;

      let sysPrompt: string;
      if (isFigural) {
        // For figural/visual topics: Claude generates text describing the visual pattern.
        // The actual SVG illustration will be generated in the next step.
        const figuralGuide: Record<string, string> = {
          figural_analogi: `Generate a figural analogy question. Describe shapes/figures using text labels (e.g., "Gambar A: segitiga besar menghadap kanan", "Gambar B: segitiga kecil menghadap kiri"). The question asks: gambar A : gambar B = gambar C : ?`,
          figural_ketidaksamaan: `Generate a figural odd-one-out question. Describe 5 figures using text (e.g., shapes, rotations, symmetry). One figure is different from the rest.`,
          figural_serial: `Generate a figural series question. Describe a sequence of 4 figures that follow a visual pattern (e.g., rotation, addition/removal of elements, size change). The final item is missing and must be answered from the text options.`,
        };
        sysPrompt = `You are a JSON generator for Indonesian CPNS TIU ${topicDesc} exam questions.
This question will be paired with an SVG illustration generated afterward — so describe visual elements clearly in text.
Output ONLY a single valid JSON object. No prose, no markdown, no code fences.

${figuralGuide[topic] ?? ""}
Visual variation target for this request: ${imageVariant}.
${custom_instruction ? `\nCustom instruction: ${custom_instruction}` : ""}

Output a JSON object with exactly:
- "question_text": question string in Indonesian (describe figures/shapes textually, e.g. "Perhatikan pola gambar berikut: ...")
- "options": array of exactly 5 strings — describe each answer choice as a shape/figure description (e.g. "Segitiga besar menghadap kiri")
- "correct_answer": string EXACTLY matching one of the options
- "explanation": 2-3 sentences in Indonesian explaining the visual pattern and why the answer is correct
- "svg_prompt": precise description for image generator that contains ONLY the stimulus image, never the answer. Use a blank box, question mark, or missing slot where the answer should be.

CRITICAL FOR svg_prompt:
- Do NOT include the correct answer or final solved item.
- Do NOT write "answer", "solution", "Box D (answer)", or any wording that reveals which option is correct.
- The image must behave like the exam stimulus. It may show given figures A, B, C and a blank/question-mark area, but the answer must remain only in the text options.

IMPORTANT: Randomize the order of the options.

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

IMPORTANT: Randomize the order of the options and their corresponding point mappings.

Output ONLY the JSON object.`;
      } else {
        sysPrompt = `You are a JSON generator for Indonesian CPNS exam questions. Output ONLY a single valid JSON object. No prose, no markdown, no code fences.

Generate ONE ${subtest.toUpperCase()} question about: ${topicDesc}
${custom_instruction ? `\nCustom instruction: ${custom_instruction}` : ""}
${subtest === "tiu" ? `
This is a "soal bergambar" flow. Prefer a question that NEEDS a visual stimulus.
Visual direction for topic:
${tiuImageGuide}
Visual variation target for this request: ${imageVariant}.
Do not default to only circles/squares. Use varied diagrams, patterns, grids, tables, symbols, numbers, arrows, rotations, shading, positions, or realistic quantitative data when appropriate.
` : ""}

Output a JSON object with exactly:
- "question_text": clear question string in Indonesian
- "options": array of exactly 5 strings (answer choices)
- "correct_answer": string EXACTLY matching one of the options
- "explanation": 2-3 sentence explanation in Indonesian
- "svg_prompt": one-sentence description for an image stimulus. For TIU, this should usually be a concrete diagram/table/grid/pattern prompt, not "none".

CRITICAL FOR svg_prompt:
- It must contain only the exam stimulus, never the correct answer.
- If an item is missing, show it as a blank cell, empty box, or question mark.
- Do not include answer choices, check marks, solution arrows, or explanation text in the image.

IMPORTANT: Randomize the order of the options.

Output ONLY the JSON object.`;
      }

      const res = await fetch(KIE_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${globalKieApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sysPrompt, messages: [{ role: "user", content: "Generate the question now." }], stream: false }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return json({ error: `KIE API error ${res.status}: ${errText.slice(0, 200)}` });
      }
      const resData = await res.json();
      if (resData?.type === "error" || resData?.error) {
        return json({ error: resData?.error?.message ?? "KIE API error" });
      }
      const rawText = (resData.content as Array<{ type: string; text?: string }>)?.find(b => b.type === "text")?.text ?? "";
      const objStart = rawText.indexOf("{");
      const objEnd = rawText.lastIndexOf("}");
      if (objStart === -1 || objEnd <= objStart) return json({ error: `AI tidak mengembalikan JSON yang valid. Preview: ${rawText.slice(0, 100)}` });
      try {
        const q = JSON.parse(rawText.slice(objStart, objEnd + 1));
        const prepared = prepareGeneratedQuestion({ item: q, subtest, image_url: null });
        if (!prepared) return json({ error: "AI mengembalikan format soal yang tidak valid" });
        const [rebalanced] = rebalanceCorrectAnswerPositions([prepared]);
        return json({
          question: {
            question_text: rebalanced.question_text,
            options: rebalanced.options,
            correct_answer: rebalanced.correct_answer,
            explanation: rebalanced.explanation,
            option_points: rebalanced.option_points ?? null,
            svg_content: rebalanced.svg_content,
            svg_prompt: typeof q.svg_prompt === "string" ? q.svg_prompt : "",
          },
        });
      } catch {
        return json({ error: "Gagal parse JSON dari AI" });
      }
    }

    // ── Create GPT Image-2 Task (returns taskId immediately) ────────────────
    if (body.action === "create_image_task") {
      const { question_text, options, image_prompt } = body as {
        question_text: string;
        options: string[];
        image_prompt?: string;
      };
      if (!globalKieApiKey) return json({ error: "KIE API key belum dikonfigurasi." });
      if (!question_text) return json({ error: "question_text diperlukan" });

      const promptSeed = image_prompt && image_prompt.trim()
        ? image_prompt.trim()
        : `Create a varied visual stimulus for this Indonesian civil servant exam question: "${question_text}". Use one suitable format such as a matrix grid, number sequence, mini table, flowchart, Venn-style diagram, number line, comparison chart, schedule grid, route map, or geometric pattern.`;
      const prompt = `${promptSeed}

Important exam-image rules:
- The image must show only the information needed to answer the question.
- Do not show, label, highlight, or imply the correct answer.
- If the question asks for a missing figure/item, draw that area as a blank box or question mark.
- Do not include answer choices, check marks, solution arrows to the final answer, or explanation panels.
- Avoid repetitive plain circle/square-only images unless the question specifically requires them.
- Prefer varied TIU visual stimuli: patterns, matrices, diagrams, tables, grids, arrows, rotations, shading, quantities, or realistic small datasets.
- Use clean educational diagram style on a white background.`;

      const createRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        headers: { "Authorization": `Bearer ${globalKieApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-2-text-to-image",
          input: { prompt, aspect_ratio: "4:3", resolution: "1K" },
        }),
      });
      const createText = await createRes.text();
      let createData: any;
      try { createData = JSON.parse(createText); } catch { return json({ error: `KIE response tidak valid: ${createText.slice(0, 200)}` }); }
      if (!createRes.ok || createData.code !== 200) {
        return json({ error: `KIE error ${createRes.status}: ${createData.msg ?? createText.slice(0, 200)}` });
      }
      if (!createData.data?.taskId) return json({ error: "KIE tidak mengembalikan taskId" });
      return json({ taskId: createData.data.taskId });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Poll GPT Image-2 Task & Upload to Storage ─────────────────────────────
    if (body.action === "get_image_result") {
      const { taskId } = body as { taskId: string };
      if (!globalKieApiKey) return json({ error: "KIE API key belum dikonfigurasi." });
      if (!taskId) return json({ error: "taskId diperlukan" });

      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
        headers: { "Authorization": `Bearer ${globalKieApiKey}` },
      });
      const pollText = await pollRes.text();
      let pollData: any;
      try { pollData = JSON.parse(pollText); } catch { return json({ error: `Poll response tidak valid: ${pollText.slice(0, 200)}` }); }

      const d = pollData.data ?? {};
      const status = String(d.state ?? d.taskStatus ?? d.status ?? "").toLowerCase();

      if (pollData.code && pollData.code !== 200 && pollData.code !== 1) {
        return json({ status: "failed", error: `KIE Polling error ${pollData.code}: ${pollData.msg ?? JSON.stringify(pollData)}` });
      }

      if (["fail", "failed", "error"].includes(status)) {
        return json({ status: "failed", error: `Generate gambar gagal: ${JSON.stringify(d)}` });
      }
      if (!["success", "completed"].includes(status)) {
        if (["waiting", "queuing", "generating", "processing", "pending"].includes(status)) {
          return json({ status: "processing" });
        }
        if (!status) {
          return json({ status: "failed", error: `Format task KIE tidak dikenali: ${JSON.stringify(pollData)}` });
        }
        return json({ status: "processing" });
      }

      // Task selesai — ambil URL gambar
      let result: any = null;
      if (typeof d.resultJson === "string" && d.resultJson.trim()) {
        try { result = JSON.parse(d.resultJson); } catch { /* ignore invalid resultJson */ }
      } else if (d.resultJson && typeof d.resultJson === "object") {
        result = d.resultJson;
      }

      let outputUrl: string | null =
        result?.resultUrls?.[0] ??
        result?.result_urls?.[0] ??
        result?.imageUrls?.[0] ??
        result?.images?.[0] ??
        result?.url ??
        result?.imageUrl ??
        d.output?.imageUrl ??
        d.output?.image_url ??
        d.imageUrl ??
        null;
      if (!outputUrl && Array.isArray(d.output?.images)) outputUrl = d.output.images[0];
      if (!outputUrl && Array.isArray(d.output)) outputUrl = d.output[0]?.url ?? d.output[0] ?? null;
      if (!outputUrl) return json({ error: `URL gambar tidak ditemukan. Resp: ${JSON.stringify(d).slice(0, 300)}` });

      // Download gambar dan upload ke Supabase storage
      const imgRes = await fetch(outputUrl);
      if (!imgRes.ok) return json({ error: `Gagal download gambar: HTTP ${imgRes.status}` });
      const imgBuffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") ?? "image/png";
      const ext = contentType.includes("webp") ? "webp" : contentType.includes("jpeg") ? "jpg" : "png";

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const fileName = `ai-gen-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("question-images")
        .upload(fileName, imgBuffer, { contentType, upsert: false });
      if (uploadError) return json({ error: `Upload storage gagal: ${uploadError.message}` });

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from("question-images")
        .getPublicUrl(fileName);

      return json({ status: "success", image_url: publicUrl });
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
      return json({ error: "KIE API key belum dikonfigurasi. Masukkan di tab Pengaturan admin." });
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
      console.error(`KIE API error ${apiResponse.status}:`, errorText.slice(0, 500));
      return json({ error: `KIE API error ${apiResponse.status}: ${errorText.slice(0, 300)}` });
    }

    const response = await apiResponse.json();
    if (response?.type === "error" || response?.error) {
      const errMsg = response?.error?.message ?? JSON.stringify(response?.error);
      console.error("KIE API returned error:", errMsg);
      return json({ error: `KIE API: ${errMsg}` });
    }
    const textBlock = (response.content as Array<{ type: string; text?: string }>)?.find((b) => b.type === "text");
    if (!textBlock?.text) return json({ error: "Tidak ada output dari AI" });

    const rawText = textBlock.text;

    // 1. Try full array parse first
    let questionList: unknown[] = [];
    const arrStart = rawText.indexOf("[");
    const arrEnd = rawText.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        questionList = JSON.parse(rawText.slice(arrStart, arrEnd + 1));
      } catch { /* fall through */ }
    }

    // 2. Robust fallback: extract each { ... } object individually using bracket counting.
    //    Works even if the JSON array is truncated (e.g. response cut off before final ]).
    if (questionList.length === 0) {
      questionList = extractJsonObjects(rawText);
    }

    if (questionList.length === 0) {
      return json({ error: `AI tidak mengembalikan JSON yang valid. Coba lagi. (Preview: ${rawText.slice(0, 150)})` });
    }

    const prepared = questionList
      .map((item) => prepareGeneratedQuestion({ item, subtest, exam_id, image_url }))
      .filter((question): question is PreparedQuestion => question !== null);

    if (prepared.length === 0) {
      return json({
        error: "AI merespons, tetapi semua soal gagal divalidasi sebelum disimpan.",
        requested: safeCount,
        parsed: questionList.length,
      });
    }

    const readyToInsert = rebalanceCorrectAnswerPositions(prepared);
    const insertedIds: string[] = [];

    for (const payload of readyToInsert) {
      const { data: insertedRow, error: insertErr } = await supabase
        .from("questions")
        .insert(payload)
        .select("id")
        .single();
      if (!insertErr && insertedRow?.id) insertedIds.push(insertedRow.id);
    }

    if (insertedIds.length > 0 && exam_id) {
      const { count: existingAssignments } = await supabase
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", exam_id);

      await supabase.from("exam_question_assignments").insert(
        insertedIds.map((questionId, index) => ({
          exam_id,
          question_id: questionId,
          position: (existingAssignments ?? 0) + index + 1,
        })),
      );

      const { count: totalAssigned } = await supabase
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", exam_id);
      await supabase.from("exams").update({ total_questions: totalAssigned ?? insertedIds.length }).eq("id", exam_id);
    }

    return json({
      count: insertedIds.length,
      requested: safeCount,
      parsed: questionList.length,
      skipped: Math.max(questionList.length - insertedIds.length, 0),
    });
  } catch (err: unknown) {
    console.error("Unhandled error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extraHeaders },
  });
}
