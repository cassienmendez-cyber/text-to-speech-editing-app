import { useMemo, useState } from "react";
import { useStore, allCategories } from "../store";
import { speak } from "../lib/speech";
import type { Anchor, AuthorRole, FlatSentence, Note } from "../types";
import { Check, Trash, Edit } from "./icons";

interface Props {
  projectId: string;
  onJump: (anchor: Anchor) => void;
  /** Current playback location, used for "move note here". */
  current?: FlatSentence;
}

const ROLE_LABEL: Record<AuthorRole, string> = {
  author: "Author",
  editor: "Editor",
  beta: "Beta Reader",
};

const ROLE_CLASS: Record<AuthorRole, string> = {
  author: "border-accent-500/40 text-accent-400",
  editor: "border-sky-500/40 text-sky-300",
  beta: "border-emerald-500/40 text-emerald-300",
};

export default function NotesPanel({ projectId, onJump, current }: Props) {
  const project = useStore((s) => s.projects[projectId]);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const moveNote = useStore((s) => s.moveNote);
  const settings = useStore((s) => s.settings);
  const categories = allCategories(settings.customCategories);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | AuthorRole>("");
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const notes = project?.notes ?? [];
  const passById = useMemo(
    () => new Map((project?.passes ?? []).map((p) => [p.id, p.name])),
    [project?.passes],
  );

  const filtered = notes.filter((n) => {
    if (!showResolved && n.resolved) return false;
    if (categoryFilter && n.category !== categoryFilter) return false;
    if (roleFilter && n.authorRole !== roleFilter) return false;
    return true;
  });

  function moveHere(note: Note) {
    if (!current) return;
    const anchor: Anchor = {
      level: "sentence",
      chapterId: current.chapter.id,
      paragraphId: current.paragraph.id,
      sentenceId: current.sentence.id,
    };
    const context = current.paragraph.sentences.map((s) => s.text).join(" ");
    moveNote(projectId, note.id, anchor, context);
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setDraft(note.text);
  }

  function saveEdit(note: Note) {
    updateNote(projectId, note.id, { text: draft.trim() });
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 p-3">
        <select
          className="field w-auto flex-1 py-1"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className="field w-auto py-1"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | AuthorRole)}
        >
          <option value="">All authors</option>
          <option value="author">Author</option>
          <option value="editor">Editor</option>
          <option value="beta">Beta Reader</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-ink-400">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-500">
            No notes yet. Press <span className="text-accent-400">Add note</span>{" "}
            while listening to capture a revision idea.
          </p>
        )}
        {filtered.map((note) => (
          <div
            key={note.id}
            className={`card space-y-2 ${note.resolved ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${ROLE_CLASS[note.authorRole]}`}>
                {ROLE_LABEL[note.authorRole]}
              </span>
              {/* Reassign category inline. */}
              <select
                className="rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-xs text-ink-200"
                value={note.category}
                onChange={(e) =>
                  updateNote(projectId, note.id, { category: e.target.value })
                }
                title="Reassign category"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                {!categories.includes(note.category) && (
                  <option>{note.category}</option>
                )}
              </select>
              <span className="ml-auto text-[10px] text-ink-500">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>

            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  className="field min-h-[60px]"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="btn-ghost py-1"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary py-1"
                    onClick={() => saveEdit(note)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-100">
                {note.text || <em className="text-ink-500">(voice only)</em>}
              </p>
            )}

            {note.contextText && (
              <p className="line-clamp-2 text-xs italic text-ink-500">
                “{note.contextText}”
              </p>
            )}

            {(note.tags.length > 0 || note.passIds.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((t) => (
                  <span key={t} className="chip text-[10px]">
                    {t}
                  </span>
                ))}
                {note.passIds.map((id) => (
                  <span
                    key={id}
                    className="chip border-ink-600 text-[10px] text-ink-300"
                  >
                    {passById.get(id) ?? "pass"}
                  </span>
                ))}
              </div>
            )}

            {note.audioUrl && (
              <audio controls src={note.audioUrl} className="h-8 w-full" />
            )}

            <div className="flex flex-wrap items-center gap-1 pt-1 text-xs">
              <button
                className="rounded px-2 py-1 text-accent-400 hover:bg-ink-800"
                onClick={() => onJump(note.anchor)}
              >
                Go to location
              </button>
              {current && (
                <button
                  className="rounded px-2 py-1 text-ink-300 hover:bg-ink-800"
                  onClick={() => moveHere(note)}
                  title="Relocate this note to the current playback location"
                >
                  Move here
                </button>
              )}
              <button
                className="rounded px-2 py-1 text-ink-300 hover:bg-ink-800"
                onClick={() => {
                  updateNote(projectId, note.id, { resolved: !note.resolved });
                  if (settings.spokenConfirmations)
                    speak(note.resolved ? "Reopened." : "Resolved.");
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  {note.resolved ? "Reopen" : "Resolve"}
                </span>
              </button>
              <button
                className="rounded px-2 py-1 text-ink-300 hover:bg-ink-800"
                onClick={() => startEdit(note)}
              >
                <span className="inline-flex items-center gap-1">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </span>
              </button>
              <button
                className="ml-auto rounded px-2 py-1 text-red-400 hover:bg-ink-800"
                onClick={() => deleteNote(projectId, note.id)}
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
