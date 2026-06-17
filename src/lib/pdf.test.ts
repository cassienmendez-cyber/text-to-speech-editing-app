import { describe, it, expect } from "vitest";
import {
  itemsToParagraphs,
  pagesToText,
  stripRunningHeaders,
  type Line,
  type PdfItem,
} from "./pdf";

describe("itemsToParagraphs", () => {
  it("joins wrapped lines, de-hyphenates, and breaks paragraphs on big gaps", () => {
    const items: PdfItem[] = [
      { str: "The lighthouse stood", x: 50, y: 200 },
      { str: "infor-", x: 50, y: 188 }, // 12 gap (within paragraph)
      { str: "mation here.", x: 50, y: 176 }, // 12 gap; de-hyphenate
      { str: "A new paragraph begins.", x: 50, y: 146 }, // 30 gap → break
    ];
    expect(itemsToParagraphs(items)).toEqual([
      "The lighthouse stood information here.",
      "A new paragraph begins.",
    ]);
  });

  it("orders items within a line left-to-right and joins with spaces", () => {
    const items: PdfItem[] = [
      { str: "world", x: 80, y: 100 },
      { str: "Hello", x: 10, y: 100 },
    ];
    expect(itemsToParagraphs(items)).toEqual(["Hello world"]);
  });

  it("returns nothing for empty input", () => {
    expect(itemsToParagraphs([])).toEqual([]);
  });
});

describe("pagesToText", () => {
  it("separates paragraphs across pages with blank lines", () => {
    const p1: PdfItem[] = [{ str: "Page one para.", x: 0, y: 100 }];
    const p2: PdfItem[] = [{ str: "Page two para.", x: 0, y: 100 }];
    expect(pagesToText([p1, p2])).toBe("Page one para.\n\nPage two para.");
  });

  it("strips a running header repeated atop every page", () => {
    // Header line (top) + body line + page number (bottom), over 5 pages.
    const pages: PdfItem[][] = [];
    for (let i = 0; i < 5; i += 1) {
      pages.push([
        { str: "THE GREAT NOVEL", x: 0, y: 300 },
        { str: `Body sentence number ${i}.`, x: 0, y: 200 },
        { str: String(100 + i), x: 0, y: 50 },
      ]);
    }
    const out = pagesToText(pages);
    expect(out).not.toContain("THE GREAT NOVEL");
    expect(out).not.toMatch(/\b10[0-4]\b/); // page numbers gone
    expect(out).toContain("Body sentence number 0.");
    expect(out).toContain("Body sentence number 4.");
  });
});

describe("stripRunningHeaders", () => {
  const mk = (texts: string[]): Line[] =>
    texts.map((text, i) => ({ y: 1000 - i * 100, text }));

  it("drops repeated edge lines and page numbers, keeps the body", () => {
    const pages = [0, 1, 2, 3].map((i) =>
      mk(["Running Head", `Real body line ${i}`, String(200 + i)]),
    );
    const stripped = stripRunningHeaders(pages);
    for (const lines of stripped) {
      expect(lines.map((l) => l.text)).toHaveLength(1);
      expect(lines[0].text).toMatch(/^Real body line/);
    }
  });

  it("leaves content untouched when there is no repetition", () => {
    const pages = [mk(["Alpha", "Beta"]), mk(["Gamma", "Delta"])];
    expect(stripRunningHeaders(pages)).toEqual(pages);
  });
});
