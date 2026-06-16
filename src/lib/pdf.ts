// Pure PDF text-assembly helpers (no pdfjs/DOM), unit-testable in Node. The
// actual PDF parsing (pdfjs-dist + worker) lives in import.ts; here we turn the
// positioned text items it yields into clean paragraphs.

export interface PdfItem {
  str: string;
  /** x of the item's baseline (transform[4]). */
  x: number;
  /** y of the item's baseline (transform[5]); larger = higher on the page. */
  y: number;
}

interface Line {
  y: number;
  text: string;
}

/** Cluster items into visual lines (shared baseline), left-to-right. */
function clusterLines(items: PdfItem[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PdfItem[] }[] = [];
  let cur: { y: number; items: PdfItem[] } | null = null;
  for (const it of sorted) {
    if (!cur || Math.abs(it.y - cur.y) > 3) {
      cur = { y: it.y, items: [it] };
      lines.push(cur);
    } else {
      cur.items.push(it);
    }
  }
  return lines
    .map((l) => {
      let s = "";
      for (const it of [...l.items].sort((a, b) => a.x - b.x)) {
        if (s && !s.endsWith(" ") && !it.str.startsWith(" ")) s += " ";
        s += it.str;
      }
      return { y: l.y, text: s.replace(/\s+/g, " ").trim() };
    })
    .filter((l) => l.text);
}

/** Reconstruct paragraphs from one page's positioned text items, using the
 *  vertical gap between lines to detect paragraph breaks and de-hyphenating
 *  soft line-wraps. */
export function itemsToParagraphs(items: PdfItem[]): string[] {
  const lines = clusterLines(items);
  if (lines.length === 0) return [];

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) gaps.push(lines[i - 1].y - lines[i].y);
  const median = gaps.length
    ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
    : 0;

  const paras: string[] = [];
  let buf = lines[0].text;
  for (let i = 1; i < lines.length; i += 1) {
    const gap = lines[i - 1].y - lines[i].y;
    if (median > 0 && gap > median * 1.5) {
      paras.push(buf);
      buf = lines[i].text;
    } else if (buf.endsWith("-") && /^[a-z]/.test(lines[i].text)) {
      buf = buf.slice(0, -1) + lines[i].text; // de-hyphenate wrapped word
    } else {
      buf += " " + lines[i].text;
    }
  }
  paras.push(buf);
  return paras.map((p) => p.trim()).filter(Boolean);
}

/** Assemble all pages into a single text blob (paragraphs blank-line separated)
 *  suitable for parseManuscript. */
export function pagesToText(pages: PdfItem[][]): string {
  const all: string[] = [];
  for (const page of pages) all.push(...itemsToParagraphs(page));
  return all.join("\n\n");
}
