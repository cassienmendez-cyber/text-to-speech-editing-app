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
    <div className="border-t border-ink-800 bg-ink-900/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
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
          <button className="btn-icon" title="Stop" onClick={p.onStop}>
            <Stop />
          </button>
          <button
            className="btn-ghost"
            title="Repeat sentence"
            onClick={p.onRepeat}
          >
            ↺ Repeat
          </button>
        </div>

        <div className="min-w-[8rem] flex-1 text-center text-xs text-ink-400">
          {p.locationLabel}
          {!p.ttsAvailable && (
            <span className="ml-2 text-amber-400">
              (text-to-speech unavailable in this browser)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-ink-400">
            Speed
            <select
              className="field w-20 py-1"
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
              Voice
              <select
                className="field w-40 py-1"
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
          <button className="btn-primary" onClick={p.onAddNote}>
            <Mic /> Add note
          </button>
          <button className="btn-ghost" title="Bookmark" onClick={p.onBookmark}>
            <Bookmark />
          </button>
        </div>
      </div>
    </div>
  );
}
