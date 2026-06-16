import { Play, Pause, Stop, SkipBack, SkipForward, Mic, Bookmark } from "./icons";

interface Props {
  playing: boolean;
  rate: number;
  voices: SpeechSynthesisVoice[];
  voiceURI?: string;
  locationLabel: string;
  ttsAvailable: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onRepeat: () => void;
  onRate: (rate: number) => void;
  onVoice: (uri: string) => void;
  onAddNote: () => void;
  onBookmark: () => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackBar(p: Props) {
  return (
    <div
      className="border-t border-ink-800 bg-ink-900/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        {/* Location — its own line so controls never get squeezed. */}
        <div className="truncate text-center text-xs text-ink-400">
          {p.locationLabel}
          {!p.ttsAvailable && (
            <span className="ml-2 text-amber-400">(no text-to-speech here)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Transport */}
          <button className="btn-icon" title="Back 15s" onClick={p.onSkipBack}>
            <SkipBack />
          </button>
          {p.playing ? (
            <button
              className="btn-icon h-12 w-12 bg-accent-500 text-ink-950 hover:bg-accent-400"
              title="Pause"
              onClick={p.onPause}
            >
              <Pause />
            </button>
          ) : (
            <button
              className="btn-icon h-12 w-12 bg-accent-500 text-ink-950 hover:bg-accent-400"
              title="Play"
              onClick={p.onPlay}
              disabled={!p.ttsAvailable}
            >
              <Play />
            </button>
          )}
          <button
            className="btn-icon"
            title="Forward 15s"
            onClick={p.onSkipForward}
          >
            <SkipForward />
          </button>
          <button className="btn-icon" title="Repeat sentence" onClick={p.onRepeat}>
            <span className="text-lg">↺</span>
          </button>
          <button className="btn-icon" title="Stop" onClick={p.onStop}>
            <Stop />
          </button>

          {/* Divider keeps actions visually grouped on wider screens */}
          <span className="mx-1 hidden h-6 w-px bg-ink-700 sm:block" />

          {/* Primary action — always visible */}
          <button className="btn-primary" onClick={p.onAddNote}>
            <Mic /> Add note
          </button>
          <button className="btn-icon" title="Bookmark" onClick={p.onBookmark}>
            <Bookmark />
          </button>

          {/* Narration settings — wrap to their own row on small screens */}
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
          {p.voices.length > 0 && (
            <label className="flex items-center gap-1 text-xs text-ink-400">
              <span className="hidden sm:inline">Voice</span>
              <select
                className="field w-28 py-1 sm:w-40"
                value={p.voiceURI ?? ""}
                onChange={(e) => p.onVoice(e.target.value)}
              >
                {p.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
