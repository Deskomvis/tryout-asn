import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    return await file.text();
  }

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return await extractPdf(file);
  }

  throw new Error(`Format file tidak didukung: ${file.type || file.name}`);
}

async function extractPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lineBuckets = new Map<number, Array<{ x: number; text: string }>>();

    for (const rawItem of textContent.items as any[]) {
      const text = ("str" in rawItem ? String(rawItem.str) : "").trim();
      if (!text) continue;

      const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [0, 0, 0, 0, 0, 0];
      const x = Number(transform[4] ?? 0);
      const y = Number(transform[5] ?? 0);
      const lineKey = Math.round(y / 2) * 2;

      const bucket = lineBuckets.get(lineKey) ?? [];
      bucket.push({ x, text });
      lineBuckets.set(lineKey, bucket);
    }

    const pageText = Array.from(lineBuckets.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}
