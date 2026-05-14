const CHUNK_SIZE = 7000; // chars per request — keeps KIE API happy

export function splitTextIntoChunks(text: string, size = CHUNK_SIZE): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const minSplit = start + size * 0.5;
      const questionBoundaryPatterns = [
        /\n(?=\d+\s*[.)])/g,
        /\n(?=Soal\s+\d+)/gi,
        /\n{2,}/g,
      ];

      let bestBoundary = -1;
      for (const pattern of questionBoundaryPatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const idx = match.index;
          if (idx <= minSplit || idx > end) continue;
          bestBoundary = Math.max(bestBoundary, idx);
        }
      }

      if (bestBoundary !== -1) {
        end = bestBoundary + 1;
      } else {
        const lastNl = text.lastIndexOf("\n", end);
        if (lastNl > minSplit) end = lastNl + 1;
      }
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
