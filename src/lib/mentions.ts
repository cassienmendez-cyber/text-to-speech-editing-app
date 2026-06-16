import type { FlatSentence } from "../types";

// Links the story bible to the manuscript: finds where character and world
// names appear, and splits sentences into segments so the reader can render
// those names as clickable links to their profiles.

export interface Entity {
  id: string;
  kind: "character" | "world";
  name: string;
  /** All searchable names for this entity (name + future aliases). */
  names: string[];
}

/** A piece of a sentence: plain text, or text linked to an entity. */
export interface Segment {
  text: string;
  entityId?: string;
}

export interface Matcher {
  regex: RegExp | null;
  lookup: Map<string, Entity>;
}

export interface MentionAnalysis {
  /** entityId → ordered, de-duplicated flat sentence indices it appears in. */
  byEntity: Map<string, { entity: Entity; indices: number[] }>;
  /** sentenceId → segments (only for sentences that contain a mention). */
  segmentsBySentenceId: Map<string, Segment[]>;
}

export function buildEntities(project: {
  characters: { id: string; name: string; aliases?: string }[];
  world: { id: string; name: string }[];
}): Entity[] {
  const ents: Entity[] = [];
  for (const c of project.characters) {
    if (!c.name.trim()) continue;
    const aliases = (c.aliases ?? "")
      .split(/[,\n]/)
      .map((a) => a.trim())
      .filter(Boolean);
    ents.push({
      id: c.id,
      kind: "character",
      name: c.name,
      names: [c.name, ...aliases],
    });
  }
  for (const w of project.world) {
    if (w.name.trim())
      ents.push({ id: w.id, kind: "world", name: w.name, names: [w.name] });
  }
  return ents;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildMatcher(entities: Entity[]): Matcher {
  const lookup = new Map<string, Entity>();
  const names: string[] = [];
  for (const e of entities) {
    for (const raw of e.names) {
      const name = raw.trim();
      if (name.length < 2) continue; // skip single letters / empties
      names.push(name);
      lookup.set(name.toLowerCase(), e);
    }
  }
  if (names.length === 0) return { regex: null, lookup };
  // Longer names first so multi-word names win over their components.
  names.sort((a, b) => b.length - a.length);
  const alt = names.map(escapeRegex).join("|");
  return { regex: new RegExp(`\\b(${alt})\\b`, "gi"), lookup };
}

/** Split a sentence into plain/linked segments using the matcher. */
export function segmentsFor(text: string, matcher: Matcher): Segment[] {
  if (!matcher.regex) return [{ text }];
  // split() with a capturing group interleaves the matched names.
  const parts = text.split(matcher.regex);
  const out: Segment[] = [];
  for (const part of parts) {
    if (part === "") continue;
    const ent = matcher.lookup.get(part.toLowerCase());
    out.push(ent ? { text: part, entityId: ent.id } : { text: part });
  }
  return out;
}

export function analyzeMentions(
  flat: FlatSentence[],
  entities: Entity[],
): MentionAnalysis {
  const matcher = buildMatcher(entities);
  const byEntity = new Map<string, { entity: Entity; indices: number[] }>();
  for (const e of entities) byEntity.set(e.id, { entity: e, indices: [] });
  const segmentsBySentenceId = new Map<string, Segment[]>();

  if (!matcher.regex) return { byEntity, segmentsBySentenceId };

  for (const f of flat) {
    const segs = segmentsFor(f.sentence.text, matcher);
    const matched = segs.filter((s) => s.entityId);
    if (matched.length === 0) continue;
    segmentsBySentenceId.set(f.sentence.id, segs);
    const seen = new Set<string>();
    for (const s of matched) {
      if (seen.has(s.entityId!)) continue;
      seen.add(s.entityId!);
      byEntity.get(s.entityId!)?.indices.push(f.index);
    }
  }
  return { byEntity, segmentsBySentenceId };
}
