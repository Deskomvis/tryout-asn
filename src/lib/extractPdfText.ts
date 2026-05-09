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
    const pageText = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}
