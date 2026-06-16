import type { Anchor, FlatSentence } from "../types";
import NotesPanel from "./NotesPanel";
import BookmarksPanel from "./BookmarksPanel";
import Dashboard from "./Dashboard";
import AIPanel from "./AIPanel";

export type Tab = "notes" | "bookmarks" | "dashboard" | "ai";

export const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "dashboard", label: "Dashboard" },
  { id: "ai", label: "AI" },
];

interface Props {
  projectId: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  current?: FlatSentence;
  onJump: (anchor: Anchor) => void;
  onOpenSettings: () => void;
}

/** The tabbed editorial panel (Notes / Bookmarks / Dashboard / AI), shared
 *  between the desktop sidebar and the mobile drawer. */
export default function SidePanel({
  projectId,
  tab,
  setTab,
  current,
  onJump,
  onOpenSettings,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-ink-800 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex-1 py-3 ${
              tab === t.id
                ? "border-b-2 border-accent-500 text-accent-400"
                : "text-ink-400 hover:text-ink-200"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "notes" && <NotesPanel projectId={projectId} onJump={onJump} />}
        {tab === "bookmarks" && (
          <BookmarksPanel projectId={projectId} onJump={onJump} />
        )}
        {tab === "dashboard" && <Dashboard projectId={projectId} />}
        {tab === "ai" && (
          <AIPanel
            projectId={projectId}
            current={current}
            onOpenSettings={onOpenSettings}
          />
        )}
      </div>
    </div>
  );
}
