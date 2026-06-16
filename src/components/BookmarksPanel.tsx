import { useState } from "react";
import { useStore } from "../store";
import type { Anchor } from "../types";
import { Trash, Bookmark as BookmarkIcon } from "./icons";

interface Props {
  projectId: string;
  onJump: (anchor: Anchor) => void;
}

export default function BookmarksPanel({ projectId, onJump }: Props) {
  const bookmarks = useStore((s) => s.projects[projectId]?.bookmarks ?? []);
  const deleteBookmark = useStore((s) => s.deleteBookmark);
  const [query, setQuery] = useState("");

  const filtered = bookmarks.filter(
    (b) =>
      b.label.toLowerCase().includes(query.toLowerCase()) ||
      b.contextText.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-800 p-3">
        <input
          className="field py-1"
          placeholder="Search bookmarks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-500">
            No bookmarks. Use the bookmark button while listening to save a
            favorite scene or powerful moment.
          </p>
        )}
        {filtered.map((b) => (
          <div key={b.id} className="card flex items-start gap-2">
            <BookmarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
            <button className="flex-1 text-left" onClick={() => onJump(b.anchor)}>
              <p className="text-sm font-medium text-ink-100">{b.label}</p>
              <p className="line-clamp-2 text-xs italic text-ink-500">
                “{b.contextText}”
              </p>
            </button>
            <button
              className="rounded p-1 text-red-400 hover:bg-ink-800"
              onClick={() => deleteBookmark(projectId, b.id)}
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
