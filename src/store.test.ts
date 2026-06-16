import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { parseManuscript } from "./lib/parse";
import type { Note } from "./types";

function freshProject() {
  const m = parseManuscript(
    "Chapter 1\n\nHe ran. She followed.\n\nA second paragraph here.",
    "Test",
    "txt",
  );
  return useStore.getState().addProject(m);
}

function makeNote(paragraphId: string, chapterId: string): Note {
  return {
    id: "n1",
    text: "Tighten this",
    createdAt: Date.now(),
    category: "Pacing",
    tags: [],
    resolved: false,
    anchor: { level: "paragraph", chapterId, paragraphId },
    contextText: "",
    passIds: [],
  };
}

describe("store", () => {
  beforeEach(() => {
    useStore.setState({ projects: {}, currentId: null });
  });

  it("addProject seeds revisions, a default pass, and sets current", () => {
    const id = freshProject();
    const p = useStore.getState().projects[id];
    expect(useStore.getState().currentId).toBe(id);
    expect(p.revisions).toEqual([]);
    expect(p.passes).toHaveLength(1);
    expect(p.notes).toEqual([]);
  });

  it("addNote prepends and touches the manuscript", () => {
    const id = freshProject();
    const before = useStore.getState().projects[id].manuscript;
    const ch = before.chapters[0];
    useStore.getState().addNote(id, makeNote(ch.paragraphs[0].id, ch.id));
    const p = useStore.getState().projects[id];
    expect(p.notes).toHaveLength(1);
    expect(p.notes[0].text).toBe("Tighten this");
    // A note edits the manuscript timestamp, so the reference changes.
    expect(p.manuscript).not.toBe(before);
  });

  // Regression guard for the React #185 infinite-loop fix: playback-position
  // updates must NOT change the manuscript reference, or `flat` recomputes and
  // the narrator effect loops forever.
  it("setPlaybackIndex does not change the manuscript reference", () => {
    const id = freshProject();
    const before = useStore.getState().projects[id].manuscript;
    useStore.getState().setPlaybackIndex(id, 3);
    const after = useStore.getState().projects[id];
    expect(after.playbackIndex).toBe(3);
    expect(after.manuscript).toBe(before);
  });

  it("setRate does not change the manuscript reference", () => {
    const id = freshProject();
    const before = useStore.getState().projects[id].manuscript;
    useStore.getState().setRate(id, 1.5);
    expect(useStore.getState().projects[id].manuscript).toBe(before);
  });

  it("replaceParagraphText re-splits sentences and records via revisions", () => {
    const id = freshProject();
    const ch = useStore.getState().projects[id].manuscript.chapters[0];
    const para = ch.paragraphs[0];
    useStore
      .getState()
      .replaceParagraphText(id, ch.id, para.id, "One. Two. Three.");
    const updated = useStore
      .getState()
      .projects[id].manuscript.chapters[0].paragraphs[0];
    expect(updated.sentences.map((s) => s.text)).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
  });

  it("revision applied flag toggles", () => {
    const id = freshProject();
    const ch = useStore.getState().projects[id].manuscript.chapters[0];
    useStore.getState().addRevision(id, {
      id: "r1",
      originalText: "old",
      revisedText: "new",
      dateAccepted: Date.now(),
      source: "ai-suggest",
      chapterId: ch.id,
      paragraphId: ch.paragraphs[0].id,
      applied: true,
    });
    useStore.getState().setRevisionApplied(id, "r1", false);
    expect(useStore.getState().projects[id].revisions[0].applied).toBe(false);
  });

  it("setSetting updates settings", () => {
    useStore.getState().setSetting("aiMode", "suggest");
    expect(useStore.getState().settings.aiMode).toBe("suggest");
  });

  it("seeds empty story-bible arrays", () => {
    const id = freshProject();
    const p = useStore.getState().projects[id];
    expect(p.characters).toEqual([]);
    expect(p.world).toEqual([]);
  });

  it("characters: add, update, delete", () => {
    const id = freshProject();
    const now = Date.now();
    useStore.getState().addCharacter(id, {
      id: "c1",
      name: "Mara",
      role: "Keeper",
      physical: "",
      personality: "",
      relationships: "",
      fears: "",
      motivations: "",
      background: "",
      createdAt: now,
      updatedAt: now,
    });
    expect(useStore.getState().projects[id].characters).toHaveLength(1);

    useStore.getState().updateCharacter(id, "c1", { fears: "the dark" });
    expect(useStore.getState().projects[id].characters[0].fears).toBe(
      "the dark",
    );

    useStore.getState().deleteCharacter(id, "c1");
    expect(useStore.getState().projects[id].characters).toHaveLength(0);
  });

  it("world elements: add, update, delete", () => {
    const id = freshProject();
    const now = Date.now();
    useStore.getState().addWorldElement(id, {
      id: "w1",
      name: "The Light",
      category: "Magic System",
      rules: "Never goes out.",
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    expect(useStore.getState().projects[id].world).toHaveLength(1);

    useStore.getState().updateWorldElement(id, "w1", { category: "Creatures" });
    expect(useStore.getState().projects[id].world[0].category).toBe("Creatures");

    useStore.getState().deleteWorldElement(id, "w1");
    expect(useStore.getState().projects[id].world).toHaveLength(0);
  });
});
