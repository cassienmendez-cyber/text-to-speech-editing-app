import { describe, it, expect } from "vitest";
import {
  splitSentences,
  parseManuscript,
  flattenSentences,
  countSentences,
} from "./parse";

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("He ran. She followed. Then it stopped.")).toEqual([
      "He ran.",
      "She followed.",
      "Then it stopped.",
    ]);
  });

  it("keeps quotes and exclamation/question marks with the sentence", () => {
    const out = splitSentences('"Wait!" he cried. Was it over?');
    expect(out).toEqual(['"Wait!" he cried.', "Was it over?"]);
  });

  it("does not split on common abbreviations", () => {
    expect(splitSentences("Dr. Mara left. She waved.")).toEqual([
      "Dr. Mara left.",
      "She waved.",
    ]);
  });

  it("returns nothing for empty or whitespace input", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   \n  ")).toEqual([]);
  });
});

describe("parseManuscript", () => {
  const sample = `Chapter 1

He ran. She followed him to the door.

* * *

A new scene begins here.

Chapter 2

Only one paragraph here.`;

  it("detects chapters, paragraphs, scene breaks, and sentences", () => {
    const m = parseManuscript(sample, "Test", "txt");
    expect(m.chapters.map((c) => c.title)).toEqual(["Chapter 1", "Chapter 2"]);
    expect(m.chapters[0].paragraphs).toHaveLength(2);
    expect(m.chapters[0].paragraphs[0].sceneBreakAfter).toBe(true);
    expect(countSentences(m)).toBe(4);
    expect(m.source).toBe("txt");
  });

  it("always produces at least one chapter, even for bare prose", () => {
    const m = parseManuscript("Just one line of prose.", "Bare", "txt");
    expect(m.chapters).toHaveLength(1);
    expect(countSentences(m)).toBe(1);
  });

  it("assigns unique ids to every sentence", () => {
    const m = parseManuscript(sample, "Test", "txt");
    const ids = flattenSentences(m).map((f) => f.sentence.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ignores a running head that repeats the current chapter title", () => {
    // A PDF running head printing "Chapter 1" atop each page must not split
    // one chapter into several.
    const raw = `Chapter 1

First page prose here.

Chapter 1

Second page prose continues.`;
    const m = parseManuscript(raw, "Run", "pdf");
    expect(m.chapters.map((c) => c.title)).toEqual(["Chapter 1"]);
    expect(m.chapters[0].paragraphs).toHaveLength(2);
  });

  it("treats a long prose line starting with 'Chapter' as prose, not a heading", () => {
    const raw =
      "Chapter books were her favorite thing in the whole world and she read them every single night before bed.";
    const m = parseManuscript(raw, "Prose", "pdf");
    expect(m.chapters).toHaveLength(1);
    expect(m.chapters[0].title).toBe("Chapter 1");
    expect(countSentences(m)).toBe(1);
  });
});

describe("flattenSentences", () => {
  it("produces a contiguous ordered index with correct back-references", () => {
    const m = parseManuscript("Chapter 1\n\nA. B.\n\nC.", "T", "txt");
    const flat = flattenSentences(m);
    expect(flat.map((f) => f.index)).toEqual([0, 1, 2]);
    // Each flat entry points back at the chapter/paragraph that contains it.
    for (const f of flat) {
      expect(f.chapter.paragraphs).toContain(f.paragraph);
      expect(f.paragraph.sentences).toContain(f.sentence);
    }
  });
});
