import { useEffect, useRef } from "react";
import { X } from "./icons";

interface ChapterEntry {
  id: string;
  title: string;
  /** Flattened sentence index of the chapter's first sentence. */
  index: number;
}

interface Props {
  chapters: ChapterEntry[];
  /** Chapter id currently being read (highlighted + scrolled into view). */
  currentId?: string;
  onJump: (index: number) => void;
  onClose: () => void;
}

/** Quick table-of-contents: jump straight to any chapter without scrolling. */
export default function ChapterMenu({
  chapters,
  currentId,
  onJump,
  onClose,
}: Props) {
  const currentRef = useRef<HTMLButtonElement>(null);

  // Open the list scrolled to wherever you left off.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="sheet flex max-h-[80vh] w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-800 pb-3">
          <h3 className="text-lg font-semibold text-ink-50">Chapters</h3>
          <button className="btn-icon h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto">
          {chapters.length === 0 ? (
            <p className="px-2 py-4 text-sm text-ink-400">No chapters.</p>
          ) : (
            chapters.map((c, i) => {
              const active = c.id === currentId;
              return (
                <button
                  key={c.id}
                  ref={active ? currentRef : undefined}
                  onClick={() => {
                    onJump(c.index);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    active
                      ? "bg-accent-500/20 text-ink-50"
                      : "text-ink-200 hover:bg-ink-800"
                  }`}
                >
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-500">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  {active && (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-accent-300">
                      Reading
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
