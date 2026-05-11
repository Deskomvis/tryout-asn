const CHUNK_SIZE = 7000; // chars per request — keeps KIE API happy

export function splitTextIntoChunks(text: string, size = CHUNK_SIZE): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      // Try to split at a newline near the boundary
      const lastNl = text.lastIndexOf("\n", end);
      if (lastNl > start + size * 0.5) end = lastNl + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
