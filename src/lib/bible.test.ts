import { describe, it, expect } from "vitest";
import { buildBibleContext } from "./bible";
import type { CharacterProfile, WorldElement } from "../types";

const char = (over: Partial<CharacterProfile>): CharacterProfile => ({
  id: "c",
  name: "",
  role: "",
  physical: "",
  personality: "",
  relationships: "",
  fears: "",
  motivations: "",
  background: "",
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const world = (over: Partial<WorldElement>): WorldElement => ({
  id: "w",
  name: "",
  category: "Magic System",
  rules: "",
  notes: "",
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("buildBibleContext", () => {
  it("returns empty string when there is nothing", () => {
    expect(buildBibleContext({ characters: [], world: [] })).toBe("");
  });

  it("includes named characters with their details", () => {
    const out = buildBibleContext({
      characters: [char({ name: "Mara", role: "Keeper", fears: "the dark" })],
      world: [],
    });
    expect(out).toContain("Characters:");
    expect(out).toContain("Mara");
    expect(out).toContain("role: Keeper");
    expect(out).toContain("fears: the dark");
  });

  it("includes world rules with category", () => {
    const out = buildBibleContext({
      characters: [],
      world: [
        world({
          name: "The Light",
          category: "Magic System",
          rules: "Never goes out on its own.",
        }),
      ],
    });
    expect(out).toContain("World rules:");
    expect(out).toContain("[Magic System] The Light");
    expect(out).toContain("Never goes out");
  });

  it("skips unnamed entries", () => {
    const out = buildBibleContext({
      characters: [char({ name: "  " })],
      world: [world({ name: "" })],
    });
    expect(out).toBe("");
  });
});
