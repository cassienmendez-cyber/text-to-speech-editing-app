import { useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store";
import type {
  CharacterProfile,
  FlatSentence,
  WorldCategory,
  WorldElement,
} from "../types";
import { X, Plus, Trash, ArrowLeft } from "./icons";

type Section = "characters" | "world";

/** entityId → flat sentence indices where it is mentioned. */
type MentionIndex = Map<string, { indices: number[] }>;

interface BibleProps {
  projectId: string;
  onClose: () => void;
  flat?: FlatSentence[];
  mentionIndex?: MentionIndex;
  focusEntityId?: string | null;
  onJumpTo?: (flatIndex: number) => void;
}

const WORLD_CATEGORIES: WorldCategory[] = [
  "Magic System",
  "History / Timeline",
  "Creatures",
  "Social Structure",
  "Geography",
  "Technology",
  "Other",
];

function emptyCharacter(): CharacterProfile {
  const now = Date.now();
  return {
    id: nanoid(10),
    name: "",
    role: "",
    physical: "",
    personality: "",
    relationships: "",
    fears: "",
    motivations: "",
    background: "",
    createdAt: now,
    updatedAt: now,
  };
}

function emptyWorld(): WorldElement {
  const now = Date.now();
  return {
    id: nanoid(10),
    name: "",
    category: "Magic System",
    rules: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export default function StoryBible({
  projectId,
  onClose,
  flat,
  mentionIndex,
  focusEntityId,
  onJumpTo,
}: BibleProps) {
  const project = useStore((s) => s.projects[projectId]);
  const [section, setSection] = useState<Section>(() => {
    if (focusEntityId && project?.world.some((w) => w.id === focusEntityId))
      return "world";
    return "characters";
  });
  const [editing, setEditing] = useState<
    | { type: "character"; draft: CharacterProfile; isNew: boolean }
    | { type: "world"; draft: WorldElement; isNew: boolean }
    | null
  >(() => {
    if (!focusEntityId || !project) return null;
    const c = project.characters.find((x) => x.id === focusEntityId);
    if (c) return { type: "character", draft: c, isNew: false };
    const w = project.world.find((x) => x.id === focusEntityId);
    if (w) return { type: "world", draft: w, isNew: false };
    return null;
  });

  if (!project) return null;

  const mentionCount = (id: string) => mentionIndex?.get(id)?.indices.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950">
      <header className="flex items-center gap-3 border-b border-ink-800 px-4 py-3">
        {editing ? (
          <button className="btn-icon" onClick={() => setEditing(null)}>
            <ArrowLeft />
          </button>
        ) : (
          <span className="text-sm font-semibold uppercase tracking-widest text-accent-500">
            Story Bible
          </span>
        )}
        <div className="flex-1" />
        <button className="btn-icon" onClick={onClose} title="Close">
          <X />
        </button>
      </header>

      {editing ? (
        editing.type === "character" ? (
          <CharacterEditor
            projectId={projectId}
            draft={editing.draft}
            isNew={editing.isNew}
            onDone={() => setEditing(null)}
            mentions={
              <Mentions
                indices={mentionIndex?.get(editing.draft.id)?.indices}
                flat={flat}
                onJumpTo={onJumpTo}
              />
            }
          />
        ) : (
          <WorldEditor
            projectId={projectId}
            draft={editing.draft}
            isNew={editing.isNew}
            onDone={() => setEditing(null)}
            mentions={
              <Mentions
                indices={mentionIndex?.get(editing.draft.id)?.indices}
                flat={flat}
                onJumpTo={onJumpTo}
              />
            }
          />
        )
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 py-4">
          <div className="mb-4 flex gap-2">
            <button
              className={section === "characters" ? "btn-primary" : "btn-ghost"}
              onClick={() => setSection("characters")}
            >
              Characters ({project.characters.length})
            </button>
            <button
              className={section === "world" ? "btn-primary" : "btn-ghost"}
              onClick={() => setSection("world")}
            >
              Worldbuilding ({project.world.length})
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {section === "characters" && (
              <>
                {project.characters.length === 0 && (
                  <Empty text="No characters yet. Build profiles the AI can reference during analysis." />
                )}
                {project.characters.map((c) => (
                  <button
                    key={c.id}
                    className="card flex w-full items-center justify-between text-left hover:border-accent-500/50"
                    onClick={() =>
                      setEditing({ type: "character", draft: c, isNew: false })
                    }
                  >
                    <div>
                      <p className="font-medium text-ink-50">
                        {c.name || "(unnamed)"}
                      </p>
                      {c.role && (
                        <p className="text-xs text-ink-400">{c.role}</p>
                      )}
                    </div>
                    {mentionCount(c.id) > 0 && (
                      <span className="chip text-[10px]">
                        {mentionCount(c.id)} mentions
                      </span>
                    )}
                  </button>
                ))}
                <button
                  className="btn-ghost w-full"
                  onClick={() =>
                    setEditing({
                      type: "character",
                      draft: emptyCharacter(),
                      isNew: true,
                    })
                  }
                >
                  <Plus /> Add character
                </button>
              </>
            )}

            {section === "world" && (
              <>
                {project.world.length === 0 && (
                  <Empty text="No world rules yet. Define magic systems, timelines, creatures, and social structures — the AI can flag continuity issues against them." />
                )}
                {project.world.map((w) => (
                  <button
                    key={w.id}
                    className="card flex w-full items-center justify-between text-left hover:border-accent-500/50"
                    onClick={() =>
                      setEditing({ type: "world", draft: w, isNew: false })
                    }
                  >
                    <div>
                      <p className="font-medium text-ink-50">
                        {w.name || "(unnamed)"}
                      </p>
                      <p className="text-xs text-ink-400">{w.category}</p>
                    </div>
                    {mentionCount(w.id) > 0 && (
                      <span className="chip text-[10px]">
                        {mentionCount(w.id)} mentions
                      </span>
                    )}
                  </button>
                ))}
                <button
                  className="btn-ghost w-full"
                  onClick={() =>
                    setEditing({
                      type: "world",
                      draft: emptyWorld(),
                      isNew: true,
                    })
                  }
                >
                  <Plus /> Add world element
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-8 text-center text-sm text-ink-500">{text}</p>;
}

/** Jump-to list of manuscript locations where this entity is mentioned. */
function Mentions({
  indices,
  flat,
  onJumpTo,
}: {
  indices?: number[];
  flat?: FlatSentence[];
  onJumpTo?: (i: number) => void;
}) {
  if (!flat || !onJumpTo || !indices || indices.length === 0) return null;
  return (
    <section className="space-y-1 border-t border-ink-800 pt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        Mentions in the manuscript ({indices.length})
      </h4>
      {indices.slice(0, 50).map((i) => {
        const f = flat[i];
        if (!f) return null;
        return (
          <button
            key={i}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-800"
            onClick={() => onJumpTo(i)}
          >
            <span className="text-accent-400">{f.chapter.title}</span>
            <span className="ml-2 text-ink-400">“{f.sentence.text}”</span>
          </button>
        );
      })}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block text-xs text-ink-400">
      {label}
      {textarea ? (
        <textarea
          className="field mt-1 min-h-[64px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field mt-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function CharacterEditor({
  projectId,
  draft,
  isNew,
  onDone,
  mentions,
}: {
  projectId: string;
  draft: CharacterProfile;
  isNew: boolean;
  onDone: () => void;
  mentions?: ReactNode;
}) {
  const addCharacter = useStore((s) => s.addCharacter);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const [c, setC] = useState(draft);
  const set = (k: keyof CharacterProfile) => (v: string) =>
    setC((prev) => ({ ...prev, [k]: v }));

  function save() {
    if (isNew) addCharacter(projectId, c);
    else updateCharacter(projectId, c.id, c);
    onDone();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <Field label="Name" value={c.name} onChange={set("name")} />
      <Field label="Role / summary" value={c.role} onChange={set("role")} />
      <Field label="Physical description" value={c.physical} onChange={set("physical")} textarea />
      <Field label="Personality" value={c.personality} onChange={set("personality")} textarea />
      <Field label="Relationships" value={c.relationships} onChange={set("relationships")} textarea />
      <Field label="Fears" value={c.fears} onChange={set("fears")} textarea />
      <Field label="Motivations" value={c.motivations} onChange={set("motivations")} textarea />
      <Field label="Background" value={c.background} onChange={set("background")} textarea />

      {mentions}

      <div className="flex items-center justify-between pt-2">
        {!isNew ? (
          <button
            className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-ink-800"
            onClick={() => {
              deleteCharacter(projectId, c.id);
              onDone();
            }}
          >
            <span className="inline-flex items-center gap-1">
              <Trash className="h-4 w-4" /> Delete
            </span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!c.name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function WorldEditor({
  projectId,
  draft,
  isNew,
  onDone,
  mentions,
}: {
  projectId: string;
  draft: WorldElement;
  isNew: boolean;
  onDone: () => void;
  mentions?: ReactNode;
}) {
  const addWorldElement = useStore((s) => s.addWorldElement);
  const updateWorldElement = useStore((s) => s.updateWorldElement);
  const deleteWorldElement = useStore((s) => s.deleteWorldElement);
  const [w, setW] = useState(draft);

  function save() {
    if (isNew) addWorldElement(projectId, w);
    else updateWorldElement(projectId, w.id, w);
    onDone();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <Field
        label="Name"
        value={w.name}
        onChange={(v) => setW((p) => ({ ...p, name: v }))}
      />
      <label className="block text-xs text-ink-400">
        Category
        <select
          className="field mt-1"
          value={w.category}
          onChange={(e) =>
            setW((p) => ({ ...p, category: e.target.value as WorldCategory }))
          }
        >
          {WORLD_CATEGORIES.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </label>
      <Field
        label="Rules / facts (must stay consistent)"
        value={w.rules}
        onChange={(v) => setW((p) => ({ ...p, rules: v }))}
        textarea
      />
      <Field
        label="Notes"
        value={w.notes}
        onChange={(v) => setW((p) => ({ ...p, notes: v }))}
        textarea
      />

      {mentions}

      <div className="flex items-center justify-between pt-2">
        {!isNew ? (
          <button
            className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-ink-800"
            onClick={() => {
              deleteWorldElement(projectId, w.id);
              onDone();
            }}
          >
            <span className="inline-flex items-center gap-1">
              <Trash className="h-4 w-4" /> Delete
            </span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!w.name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
