import { Play, Pause, SkipBack, SkipForward, Mic, Bookmark } from "./icons";

interface Props {
  playing: boolean;
  rate: number;
  locationLabel: string;
  ttsAvailable: boolean;
  fontScale: number;
  onPlay: () => void;
  onPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onRepeat: () => void;
  onRate: (rate: number) => void;
  onAddNote: () => void;
  onBookmark: () => void;
  onFontSmaller: () => void;
  onFontLarger: () => void;
  onOpenChapters: () => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackBar(p: Props) {
  return (
    <div
      className="border-t border-ink-800 bg-ink-900/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="text-center text-xs text-ink-400">
          <button
            className="mx-auto inline-flex max-w-full items-center gap-1 truncate rounded px-2 py-0.5 hover:bg-ink-800 hover:text-ink-200"
            onClick={p.onOpenChapters}
            title="Jump to a chapter"
          >
            <span className="truncate">{p.locationLabel}</span>
            <span className="shrink-0 text-[10px]">▾</span>
          </button>
          {!p.ttsAvailable && (
            <span className="ml-2 text-amber-400">(no text-to-speech here)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {/* Transport — the core of the loop */}
          <div className="flex items-center gap-1.5">
            <button className="btn-icon" title="Back 15s" onClick={p.onSkipBack}>
              <SkipBack />
            </button>
            <button
              className="btn-icon h-12 w-12 bg-accent-500 text-ink-950 hover:bg-accent-400"
              title={p.playing ? "Pause" : "Play"}
              onClick={p.playing ? p.onPause : p.onPlay}
              disabled={!p.ttsAvailable}
            >
              {p.playing ? <Pause /> : <Play />}
            </button>
            <button
              className="btn-icon"
              title="Forward 15s"
              onClick={p.onSkipForward}
            >
              <SkipForward />
            </button>
            <button
              className="btn-icon"
              title="Repeat sentence"
              onClick={p.onRepeat}
            >
              <span className="text-lg">↺</span>
            </button>
          </div>

          {/* Primary action */}
          <button className="btn-primary" onClick={p.onAddNote}>
            <Mic /> Add note
          </button>

          {/* Secondary, set-and-mostly-forget controls */}
          <div className="flex items-center gap-2">
            <button className="btn-icon" title="Bookmark" onClick={p.onBookmark}>
              <Bookmark />
            </button>
            <label className="flex items-center gap-1 text-xs text-ink-400">
              <span className="hidden sm:inline">Speed</span>
              <select
                className="field w-16 py-1"
                value={p.rate}
                onChange={(e) => p.onRate(Number(e.target.value))}
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            </label>
            <div
              className="flex items-center overflow-hidden rounded-lg border border-ink-700"
              title="Reader text size"
              aria-label="Reader text size"
            >
              <button
                className="flex items-center gap-0.5 px-2 py-1 text-ink-200 hover:bg-ink-800"
                onClick={p.onFontSmaller}
                aria-label="Smaller text"
                title="Smaller text"
              >
                <span className="text-xs font-semibold">A</span>
                <span className="text-sm">−</span>
              </button>
              <span className="px-1 text-[10px] text-ink-500">
                {Math.round(p.fontScale * 100)}%
              </span>
              <button
                className="flex items-center gap-0.5 px-2 py-1 text-ink-200 hover:bg-ink-800"
                onClick={p.onFontLarger}
                aria-label="Larger text"
                title="Larger text"
              >
                <span className="text-base font-semibold">A</span>
                <span className="text-sm">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
