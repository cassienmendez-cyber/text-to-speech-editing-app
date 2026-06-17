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

export interface Line {
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

/** Turn clustered lines into paragraphs, using the vertical gap between lines
 *  to detect paragraph breaks and de-hyphenating soft line-wraps. */
function linesToParagraphs(lines: Line[]): string[] {
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

/** Reconstruct paragraphs from one page's positioned text items. */
export function itemsToParagraphs(items: PdfItem[]): string[] {
  return linesToParagraphs(clusterLines(items));
}

/** Matches a line that is only a page number: "12", "Page 12", "- 12 -", or a
 *  roman numeral. Such lines are stripped when they sit at a page's edge. */
const PAGE_NUMBER =
  /^(?:page\s+)?\d{1,4}$|^[-–—]\s*\d{1,4}\s*[-–—]$|^[ivxlcdm]{1,7}$/i;

/** Normalize an edge line for repetition comparison: case-fold, blank out
 *  digits (page numbers vary per page) and collapse whitespace, so e.g.
 *  "Chapter 15 · 237" and "Chapter 15 · 238" group as the same running head. */
function normalizeEdge(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove running headers/footers and page numbers — the repeated book/chapter
 * title and page digits that print at the top/bottom margin of every page.
 * Left in, they pollute the prose and (when a chapter title repeats) make the
 * parser split one chapter into many. Only a page's first and/or last line is
 * ever a candidate, so interior text is never touched.
 */
export function stripRunningHeaders(pageLines: Line[][]): Line[][] {
  const pageCount = pageLines.length;

  // How often each normalized edge line recurs across pages.
  const freq = new Map<string, number>();
  const bump = (t: string) => freq.set(t, (freq.get(t) ?? 0) + 1);
  for (const lines of pageLines) {
    if (lines.length === 0) continue;
    bump(normalizeEdge(lines[0].text));
    if (lines.length > 1) bump(normalizeEdge(lines[lines.length - 1].text));
  }
  // A genuine running head appears on most pages; require a healthy majority
  // (and enough pages to be sure) so repeated dialogue lines aren't culled.
  const threshold = Math.max(3, Math.ceil(pageCount * 0.5));
  const repeated = new Set<string>();
  for (const [t, n] of freq) if (n >= threshold) repeated.add(t);

  const isJunk = (text: string) =>
    PAGE_NUMBER.test(text.trim()) ||
    (pageCount >= 4 && repeated.has(normalizeEdge(text)));

  return pageLines.map((lines) => {
    if (lines.length === 0) return lines;
    let start = 0;
    let end = lines.length; // exclusive
    if (isJunk(lines[start].text)) start += 1;
    if (end - 1 > start && isJunk(lines[end - 1].text)) end -= 1;
    return lines.slice(start, end);
  });
}

/** Assemble all pages into a single text blob (paragraphs blank-line separated)
 *  suitable for parseManuscript, after stripping running heads/footers. */
export function pagesToText(pages: PdfItem[][]): string {
  const stripped = stripRunningHeaders(pages.map(clusterLines));
  const all: string[] = [];
  for (const lines of stripped) all.push(...linesToParagraphs(lines));
  return all.join("\n\n");
}
