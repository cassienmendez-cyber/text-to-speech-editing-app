import { useRef, useState } from "react";
import { useStore } from "../store";
import { importManuscriptFile } from "../lib/import";
import { countSentences, parseManuscript } from "../lib/parse";
import SettingsModal from "./SettingsModal";
import { Book, Plus, Trash, Settings } from "./icons";

const SAMPLE = `Chapter 1

The lighthouse had been dark for thirty years when Mara first climbed its stairs. Salt had eaten through the railings, and every step complained beneath her boots. She told herself she was only curious. She told herself a great many things that winter.

At the top, the lamp room waited like a held breath. Glass on every side, the sea flung grey and endless beyond it. On the floor, half buried in dust, lay a logbook. Its pages were swollen with damp, but the ink had survived.

* * *

She read the first entry by the light of her phone. "If anyone finds this," it began, "the light did not fail. I turned it off myself." Mara's hand went cold. Outside, far across the water, something answered the empty tower with a single, distant flash.

Chapter 2

Morning came reluctant and thin. Mara had not slept. The logbook sat on her kitchen table where she could watch it, as though it might leave on its own. Names filled its margins, dates that made no sense, and one phrase repeated until the pen had torn the paper: keep it dark, keep it dark, keep it dark.`;

export default function Library() {
  const projects = useStore((s) => s.projects);
  const addProject = useStore((s) => s.addProject);
  const setCurrent = useStore((s) => s.setCurrent);
  const removeProject = useStore((s) => s.removeProject);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const list = Object.values(projects).sort(
    (a, b) => b.manuscript.updatedAt - a.manuscript.updatedAt,
  );

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const manuscript = await importManuscriptFile(file);
        addProject(manuscript);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function loadSample() {
    addProject(parseManuscript(SAMPLE, "The Keeper's Log (sample)", "txt"));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex justify-end">
        <button
          className="btn-icon"
          title="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings />
        </button>
      </div>
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink-50">
          Story<span className="text-accent-500">Scribe</span>
        </h1>
        <p className="mt-2 text-ink-300">
          An audio-first revision companion. Listen to your manuscript, capture
          ideas by voice, and revise wherever stories happen.
        </p>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      <div
        className="card flex flex-col items-center gap-4 border-dashed py-10 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Book className="h-8 w-8 text-accent-500" />
        <div>
          <p className="font-medium text-ink-100">Import a manuscript</p>
          <p className="text-sm text-ink-400">
            Drag &amp; drop or choose a DOCX or TXT file. Everything stays on
            your device.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            className="btn-primary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Plus /> {busy ? "Importing…" : "Choose file"}
          </button>
          <button className="btn-ghost" onClick={loadSample} disabled={busy}>
            Load sample manuscript
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {list.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
            Your projects
          </h2>
          <ul className="space-y-2">
            {list.map((p) => (
              <li
                key={p.manuscript.id}
                className="card flex items-center justify-between gap-4 hover:border-accent-500/50"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => setCurrent(p.manuscript.id)}
                >
                  <p className="font-medium text-ink-50">{p.manuscript.title}</p>
                  <p className="text-xs text-ink-400">
                    {p.manuscript.chapters.length} chapters ·{" "}
                    {countSentences(p.manuscript)} sentences · {p.notes.length}{" "}
                    notes · updated{" "}
                    {new Date(p.manuscript.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  className="btn-icon"
                  title="Delete project"
                  onClick={() => {
                    if (confirm(`Delete "${p.manuscript.title}"?`))
                      removeProject(p.manuscript.id);
                  }}
                >
                  <Trash />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
