import { useEffect, useState } from "react";
import { useStore, clampFontScale, FONT_STEP } from "../store";
import { loadVoices } from "../lib/speech";
import { ESPEAK_VOICES } from "../lib/espeak";
import type { AIMode, DrivingConfidence, Settings } from "../types";
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

// Swatch colors mirror each theme's accent so the picker previews correctly
// regardless of the active theme.
const THEMES: { id: string; label: string; accent: string; bg: string }[] = [
  { id: "ember", label: "Ember", accent: "#e8893a", bg: "#12141c" },
  { id: "halloween", label: "Halloween", accent: "#ea580c", bg: "#0c0a12" },
  { id: "ocean", label: "Ocean", accent: "#0ea5e9", bg: "#08111c" },
  { id: "irish", label: "Luck o' the Irish", accent: "#22c55e", bg: "#07140d" },
  { id: "rainbow", label: "Rainbow", accent: "#d946ef", bg: "#0c0a14" },
  { id: "synthwave", label: "Synthwave", accent: "#db2777", bg: "#0e0b1a" },
  { id: "hilo", label: "Hi-Lo", accent: "#84f028", bg: "#000000" },
  { id: "sakura", label: "Sakura", accent: "#ec6ead", bg: "#160f14" },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  return (
    <div className="modal-scrim">
      <div className="sheet max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-50">Settings</h3>
          <button className="btn-icon h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Theme
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSetting("theme", t.id)}
                className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs ${
                  settings.theme === t.id
                    ? "border-accent-500 text-ink-50"
                    : "border-ink-700 text-ink-300 hover:border-ink-600"
                }`}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-white/20"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${t.accent}, ${t.bg})`,
                  }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Reader text size
          </h4>
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost"
              onClick={() =>
                setSetting(
                  "fontScale",
                  clampFontScale(settings.fontScale - FONT_STEP),
                )
              }
              aria-label="Smaller text"
            >
              <span className="text-xs font-semibold">A</span>
              <span>−</span>
            </button>
            <span className="min-w-[3rem] text-center text-sm text-ink-200">
              {Math.round(settings.fontScale * 100)}%
            </span>
            <button
              className="btn-ghost"
              onClick={() =>
                setSetting(
                  "fontScale",
                  clampFontScale(settings.fontScale + FONT_STEP),
                )
              }
              aria-label="Larger text"
            >
              <span className="text-lg font-semibold">A</span>
              <span>+</span>
            </button>
            <button
              className="ml-auto text-xs text-ink-400 hover:underline"
              onClick={() => setSetting("fontScale", 1)}
            >
              Reset
            </button>
          </div>
          <p
            className="font-serif text-ink-200"
            style={{ fontSize: `${(1.05 * settings.fontScale).toFixed(3)}rem` }}
          >
            The lighthouse had been dark for thirty years.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Narration voice
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSetting("ttsEngine", "device")}
              className={`rounded-lg border p-2 text-left text-sm ${
                settings.ttsEngine === "device"
                  ? "border-accent-500 bg-ink-800 text-ink-50"
                  : "border-ink-700 text-ink-300 hover:border-ink-600"
              }`}
            >
              <div className="font-medium">Device voices</div>
              <div className="text-xs text-ink-400">
                Your phone/browser voices.
              </div>
            </button>
            <button
              onClick={() => setSetting("ttsEngine", "espeak")}
              className={`rounded-lg border p-2 text-left text-sm ${
                settings.ttsEngine === "espeak"
                  ? "border-accent-500 bg-ink-800 text-ink-50"
                  : "border-ink-700 text-ink-300 hover:border-ink-600"
              }`}
            >
              <div className="font-medium">Built-in (offline)</div>
              <div className="text-xs text-ink-400">
                Free eSpeak voices &amp; accents.
              </div>
            </button>
          </div>

          {settings.ttsEngine === "espeak" ? (
            <>
              <select
                className="field"
                value={settings.espeakVoice}
                onChange={(e) => setSetting("espeakVoice", e.target.value)}
              >
                {ESPEAK_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-500">
                Built-in voices are robotic but free, fully offline, and the same
                on every device. They load on first use.
              </p>
            </>
          ) : voices.length > 0 ? (
            <>
              <select
                className="field"
                value={settings.voiceURI ?? ""}
                onChange={(e) =>
                  setSetting("voiceURI", e.target.value || undefined)
                }
              >
                <option value="">System default</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-500">
                Voices come from your device/browser. On phones, several options
                may share the same underlying system voice — install more
                text-to-speech voices in your device settings, or switch to the
                built-in voices above.
              </p>
            </>
          ) : (
            <p className="text-xs text-ink-500">
              No device voices available — switch to the built-in voices above.
            </p>
          )}
        </section>

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
            Notes
          </h4>
          <label className="block text-xs text-ink-400">
            I'm reviewing as
            <select
              className="field mt-1"
              value={settings.defaultRole}
              onChange={(e) =>
                setSetting("defaultRole", e.target.value as Settings["defaultRole"])
              }
            >
              <option value="author">Author</option>
              <option value="editor">Editor</option>
              <option value="beta">Beta Reader</option>
            </select>
          </label>
          <p className="text-xs text-ink-500">
            New notes are tagged with this role so author, editor, and
            beta-reader feedback stay distinguishable.
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

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Reading
          </h4>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={settings.highlightNames}
              onChange={(e) => setSetting("highlightNames", e.target.checked)}
            />
            Highlight character &amp; place names
          </label>
          <p className="text-xs text-ink-500">
            Names you add to the Story Bible are colored and tappable in the
            text (a quick reference — no API key needed). Turn this off for a
            fully plain page.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Accessibility
          </h4>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => setSetting("highContrast", e.target.checked)}
            />
            High-contrast theme
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={settings.spokenConfirmations}
              onChange={(e) =>
                setSetting("spokenConfirmations", e.target.checked)
              }
            />
            Spoken confirmations (read actions aloud)
          </label>
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
