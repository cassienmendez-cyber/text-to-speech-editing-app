import { describe, it, expect } from "vitest";
import { buildEntities, analyzeMentions, type Entity } from "./mentions";
import { parseManuscript, flattenSentences } from "./parse";

const ents = (project: {
  characters: { id: string; name: string }[];
  world: { id: string; name: string }[];
}): Entity[] => buildEntities(project);

describe("buildEntities", () => {
  it("includes named characters and world elements, skipping blanks", () => {
    const out = ents({
      characters: [
        { id: "c1", name: "Mara" },
        { id: "c2", name: "  " },
      ],
      world: [{ id: "w1", name: "The Light" }],
    });
    expect(out.map((e) => e.id)).toEqual(["c1", "w1"]);
    expect(out[0].kind).toBe("character");
    expect(out[1].kind).toBe("world");
  });
});

describe("analyzeMentions", () => {
  const manuscript = parseManuscript(
    "Chapter 1\n\nMara climbed the stairs. The Light had failed.\n\nMarathon runners are unrelated. She thought of Mara again.",
    "T",
    "txt",
  );
  const flat = flattenSentences(manuscript);
  const entities = ents({
    characters: [{ id: "c1", name: "Mara" }],
    world: [{ id: "w1", name: "The Light" }],
  });

  it("indexes each entity's sentence occurrences (deduped per sentence)", () => {
    const { byEntity } = analyzeMentions(flat, entities);
    // "Mara" appears in sentence 0 and the last sentence (not "Marathon").
    expect(byEntity.get("c1")!.indices).toEqual([0, 3]);
    expect(byEntity.get("w1")!.indices).toEqual([1]);
  });

  it("does not match a name inside a larger word (word boundary)", () => {
    const { byEntity } = analyzeMentions(flat, entities);
    // sentence index 2 is the "Marathon" sentence — must not be indexed.
    expect(byEntity.get("c1")!.indices).not.toContain(2);
  });

  it("produces clickable segments only for sentences with mentions", () => {
    const { segmentsBySentenceId } = analyzeMentions(flat, entities);
    const first = flat[0].sentence.id;
    const segs = segmentsBySentenceId.get(first)!;
    expect(segs.some((s) => s.entityId === "c1")).toBe(true);
    // The plain remainder is preserved.
    expect(segs.map((s) => s.text).join("")).toBe(flat[0].sentence.text);
    // A sentence with no mention has no segments entry.
    expect(segmentsBySentenceId.has(flat[2].sentence.id)).toBe(false);
  });

  it("is case-insensitive", () => {
    const m = parseManuscript("Chapter 1\n\nMARA waved.", "T", "txt");
    const f = flattenSentences(m);
    const { byEntity } = analyzeMentions(f, ents({ characters: [{ id: "c1", name: "Mara" }], world: [] }));
    expect(byEntity.get("c1")!.indices).toEqual([0]);
  });

  it("returns empty analysis when there are no entities", () => {
    const { byEntity, segmentsBySentenceId } = analyzeMentions(flat, []);
    expect(byEntity.size).toBe(0);
    expect(segmentsBySentenceId.size).toBe(0);
  });
});
