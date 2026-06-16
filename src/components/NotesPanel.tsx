import { useMemo, useState } from "react";
import { useStore, DEFAULT_CATEGORIES } from "../store";
import type { Anchor, Note } from "../types";
import { Check, Trash, Edit } from "./icons";

interface Props {
  projectId: string;
  onJump: (anchor: Anchor) => void;
}

export default function NotesPanel({ projectId, onJump }: Props) {
  const project = useStore((s) => s.projects[projectId]);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);

  const [categoryFilter, setCategoryFilter] = useState("");
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
    return true;
  });

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
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
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
            <div className="flex items-center justify-between gap-2">
              <span className="chip border-accent-500/40 text-accent-400">
                {note.category}
              </span>
              <span className="text-[10px] text-ink-500">
                {new Date(note.createdAt).toLocaleString()}
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
              <button
                className="rounded px-2 py-1 text-ink-300 hover:bg-ink-800"
                onClick={() =>
                  updateNote(projectId, note.id, { resolved: !note.resolved })
                }
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
