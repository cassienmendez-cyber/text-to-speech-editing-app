import { describe, it, expect } from "vitest";
import { itemsToParagraphs, pagesToText, type PdfItem } from "./pdf";

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
});
