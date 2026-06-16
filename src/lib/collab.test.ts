import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { ProjectBinding, generateRoomCode } from "./collab";
import { parseManuscript } from "./parse";
import type { Note, Project } from "../types";

function baseProject(): Project {
  const manuscript = parseManuscript(
    "Chapter 1\n\nHe ran. She followed.",
    "Shared",
    "txt",
  );
  return {
    manuscript,
    notes: [],
    bookmarks: [],
    passes: [],
    revisions: [],
    characters: [],
    world: [],
    playbackIndex: 0,
    rate: 1,
  };
}

function note(id: string, text: string): Note {
  return {
    id,
    text,
    authorRole: "beta",
    createdAt: 1,
    category: "Pacing",
    tags: [],
    resolved: false,
    anchor: { level: "chapter", chapterId: "c" },
    contextText: "",
    passIds: [],
  };
}

/** Wire two bindings together so updates from one apply to the other,
 *  simulating two peers without any network. */
function connect(a: Y.Doc, b: Y.Doc) {
  a.on("update", (u: Uint8Array, origin: unknown) => {
    if (origin !== "remote") Y.applyUpdate(b, u, "remote");
  });
  b.on("update", (u: Uint8Array, origin: unknown) => {
    if (origin !== "remote") Y.applyUpdate(a, u, "remote");
  });
}

describe("ProjectBinding", () => {
  it("round-trips a project through the document", () => {
    const doc = new Y.Doc();
    const binding = new ProjectBinding(doc);
    const project = baseProject();
    project.notes = [note("n1", "tighten")];
    binding.push(project);

    const read = binding.read();
    expect(read.manuscript.title).toBe("Shared");
    expect(read.notes).toHaveLength(1);
    expect(read.notes[0].text).toBe("tighten");
  });

  it("syncs a beta reader's note from one peer to another", () => {
    const hostDoc = new Y.Doc();
    const betaDoc = new Y.Doc();
    const host = new ProjectBinding(hostDoc);
    const beta = new ProjectBinding(betaDoc);
    connect(hostDoc, betaDoc);

    let betaProject: Project | null = null;
    beta.observe((p) => (betaProject = p));

    // Host shares the project; beta receives it.
    host.push(baseProject());
    expect(betaProject).not.toBeNull();
    expect(betaProject!.manuscript.title).toBe("Shared");

    // Beta adds a note; host receives it.
    let hostProject: Project | null = null;
    host.observe((p) => (hostProject = p));
    const withNote = beta.read();
    withNote.notes = [note("b1", "loved this scene")];
    beta.push(withNote);

    expect(hostProject).not.toBeNull();
    expect(hostProject!.notes.map((n) => n.text)).toContain("loved this scene");
    expect(hostProject!.notes[0].authorRole).toBe("beta");
  });

  it("merges concurrent note additions made offline, then converges", () => {
    const d1 = new Y.Doc();
    const d2 = new Y.Doc();
    const b1 = new ProjectBinding(d1);
    const b2 = new ProjectBinding(d2);
    b1.push(baseProject());
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1), "remote"); // seed beta

    // Both peers add a note independently while "offline" (no relay).
    const p1 = b1.read();
    p1.notes = [note("a", "from author")];
    b1.push(p1);
    const p2 = b2.read();
    p2.notes = [note("z", "from beta")];
    b2.push(p2);

    // Exchange state both ways.
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1), "remote");
    Y.applyUpdate(d1, Y.encodeStateAsUpdate(d2), "remote");

    // Both notes survive and both documents converge.
    expect(b1.read().notes.map((n) => n.id).sort()).toEqual(["a", "z"]);
    expect(b2.read().notes.map((n) => n.id).sort()).toEqual(["a", "z"]);
  });

  it("generateRoomCode produces a 6-char code", () => {
    expect(generateRoomCode()).toMatch(/^[A-Z0-9]{6}$/);
  });
});
