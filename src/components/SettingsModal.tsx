import { useStore } from "../store";
import type { AIMode, DrivingConfidence } from "../types";
import { X } from "./icons";

const AI_MODES: { value: AIMode; label: string; desc: string }[] = [
  { value: "off", label: "Off", desc: "No AI processing occurs." },
  { value: "suggest", label: "Suggest", desc: "Generate rewrite suggestions." },
  { value: "analyze", label: "Analyze", desc: "Provide developmental insights." },
  {
    value: "collaborate",
    label: "Collaborate",
    desc: "Assist with selected revisions.",
  },
];

const CONFIDENCE: { value: DrivingConfidence; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Confirm every note." },
  {
    value: "standard",
    label: "Standard",
    desc: "Confirm only on low transcription confidence.",
  },
  { value: "expert", label: "Expert", desc: "Notes save automatically." },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto border-ink-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-50">Settings</h3>
          <button className="btn-icon h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            AI editorial assistant
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {AI_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setSetting("aiMode", m.value)}
                className={`rounded-lg border p-2 text-left text-sm ${
                  settings.aiMode === m.value
                    ? "border-accent-500 bg-ink-800 text-ink-50"
                    : "border-ink-700 text-ink-300 hover:border-ink-600"
                }`}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-ink-400">{m.desc}</div>
              </button>
            ))}
          </div>
          <label className="block text-xs text-ink-400">
            Anthropic API key
            <input
              type="password"
              className="field mt-1"
              placeholder="sk-ant-…"
              value={settings.apiKey}
              onChange={(e) => setSetting("apiKey", e.target.value)}
              autoComplete="off"
            />
          </label>
          <p className="text-xs text-ink-500">
            Your key is stored locally on this device and is sent only to the
            Anthropic API, and only when AI is enabled. Manuscript text is shared
            with the API only when you run an AI action. Leave AI off to keep
            everything fully local.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Drive Mode
          </h4>
          <label className="block text-xs text-ink-400">
            Wake phrase
            <input
              className="field mt-1"
              value={settings.wakePhrase}
              onChange={(e) =>
                setSetting("wakePhrase", e.target.value.toLowerCase())
              }
            />
          </label>
          <div className="text-xs text-ink-400">Driving confidence</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CONFIDENCE.map((c) => (
              <button
                key={c.value}
                onClick={() => setSetting("drivingConfidence", c.value)}
                className={`rounded-lg border p-2 text-left text-xs ${
                  settings.drivingConfidence === c.value
                    ? "border-accent-500 bg-ink-800 text-ink-50"
                    : "border-ink-700 text-ink-300 hover:border-ink-600"
                }`}
              >
                <div className="font-medium">{c.label}</div>
                <div className="text-ink-400">{c.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
