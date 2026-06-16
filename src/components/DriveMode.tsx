import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store";
import { Narrator, VoiceCapture, sttSupported } from "../lib/speech";
import type { Anchor, Bookmark, FlatSentence, Note } from "../types";
import { Play, Pause, Mic, SkipBack, SkipForward, X, Check } from "./icons";

interface Props {
  projectId: string;
  narrator: Narrator;
  flat: FlatSentence[];
  currentIndex: number;
  playing: boolean;
  onExit: () => void;
}

type Phase = "idle" | "recording" | "confirm";

export default function DriveMode({
  projectId,
  narrator,
  flat,
  currentIndex,
  playing,
  onExit,
}: Props) {
  const settings = useStore((s) => s.settings);
  const addNote = useStore((s) => s.addNote);
  const addBookmark = useStore((s) => s.addBookmark);

  const [phase, setPhase] = useState<Phase>("idle");
  const [draftText, setDraftText] = useState("");
  const [draftCategory, setDraftCategory] = useState("Line Edit");
  const [status, setStatus] = useState("Listening for commands…");
  const [summary, setSummary] = useState<null | {
    minutes: number;
    chapters: number;
    notes: number;
    bookmarks: number;
    unresolved: number;
  }>(null);

  const captureRef = useRef<VoiceCapture | null>(null);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const commandRecRef = useRef<any>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  // The voice-command recognizer is created once but its handlers must read the
  // live playback position, so route it through a ref updated every render.
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  // Session stats.
  const startedAt = useRef(Date.now());
  const notesCreated = useRef(0);
  const bookmarksAdded = useRef(0);

  // Chapter boundaries for navigation + "chapters completed".
  const chapterStarts = useMemo(() => {
    const starts: { id: string; title: string; index: number }[] = [];
    let lastId = "";
    flat.forEach((f) => {
      if (f.chapter.id !== lastId) {
        starts.push({ id: f.chapter.id, title: f.chapter.title, index: f.index });
        lastId = f.chapter.id;
      }
    });
    return starts;
  }, [flat]);
  const startChapter = useRef(chapterIndexOf(chapterStarts, currentIndex));

  function currentAnchor(): { anchor: Anchor; context: string } {
    const f = flat[indexRef.current] ?? flat[0];
    return {
      anchor: {
        level: "sentence",
        chapterId: f.chapter.id,
        paragraphId: f.paragraph.id,
        sentenceId: f.sentence.id,
      },
      context: f.paragraph.sentences.map((s) => s.text).join(" "),
    };
  }

  function gotoChapter(dir: 1 | -1) {
    const ci = chapterIndexOf(chapterStarts, indexRef.current);
    const next = chapterStarts[ci + dir];
    if (next) narrator.seek(next.index);
  }

  function saveNote(text: string, category: string, inbox: boolean) {
    const { anchor, context } = currentAnchor();
    const note: Note = {
      id: nanoid(10),
      text: text.trim(),
      audioUrl: audioUrlRef.current,
      createdAt: Date.now(),
      category,
      tags: [],
      resolved: false,
      anchor,
      contextText: context,
      playbackTimestamp: indexRef.current,
      passIds: [],
      inbox,
    };
    addNote(projectId, note);
    notesCreated.current += 1;
    audioUrlRef.current = undefined;
  }

  function quickNote(text: string) {
    saveNote(text, "Pacing", true);
    setStatus(`Quick note saved: "${text.slice(0, 30)}…"`);
  }

  function bookmarkScene() {
    const { anchor, context } = currentAnchor();
    const bookmark: Bookmark = {
      id: nanoid(10),
      label: `Drive bookmark — ${context.slice(0, 30)}`,
      anchor,
      contextText: context,
      createdAt: Date.now(),
    };
    addBookmark(projectId, bookmark);
    bookmarksAdded.current += 1;
    setStatus("Scene bookmarked.");
  }

  // ---- Note capture (voice) -------------------------------------------------
  async function startNoteCapture() {
    narrator.pause();
    stopCommandRecognition();
    setDraftText("");
    audioUrlRef.current = undefined;
    const capture = new VoiceCapture({
      onTranscript: (t) => setDraftText(t),
      onError: (m) => setStatus(m),
    });
    captureRef.current = capture;
    await capture.start();
    setPhase("recording");
    setStatus("Recording your note — say it, then tap Save.");
  }

  async function finishNoteCapture() {
    const result = await captureRef.current?.stop();
    audioUrlRef.current = result?.audioUrl;
    captureRef.current = null;
    if (settings.drivingConfidence === "expert") {
      // Expert: save automatically without confirmation.
      saveNote(draftText, draftCategory, false);
      setStatus("Note saved.");
      setPhase("idle");
      narrator.play();
      startCommandRecognition();
    } else {
      // Beginner/standard: confirm before saving.
      setPhase("confirm");
      setStatus("Review the note, then save or discard.");
    }
  }

  function confirmSave() {
    saveNote(draftText, draftCategory, false);
    setStatus("Note saved.");
    setPhase("idle");
    narrator.play();
    startCommandRecognition();
  }

  function cancelNote() {
    captureRef.current?.stop();
    captureRef.current = null;
    audioUrlRef.current = undefined;
    setPhase("idle");
    setStatus("Note cancelled.");
    narrator.play();
    startCommandRecognition();
  }

  // ---- Voice command recognition -------------------------------------------
  function handleCommand(raw: string) {
    let t = raw.toLowerCase().trim();
    const wake = settings.wakePhrase.toLowerCase();
    if (wake && t.startsWith(wake)) t = t.slice(wake.length).trim();

    if (t.startsWith("quick note")) {
      const body = t.replace("quick note", "").trim();
      if (body) quickNote(body);
      return;
    }
    if (t.includes("add note")) return void startNoteCapture();
    if (t.includes("bookmark")) return bookmarkScene();
    if (t.includes("flag pacing")) return quickNoteCat("Pacing");
    if (t.includes("flag continuity")) return quickNoteCat("Continuity");
    if (t.includes("flag character")) return quickNoteCat("Character Development");
    if (t.includes("next chapter")) return gotoChapter(1);
    if (t.includes("previous chapter") || t.includes("last chapter"))
      return gotoChapter(-1);
    if (t.includes("pause") || t.includes("stop")) return narrator.pause();
    if (t.includes("resume") || t.includes("continue") || t === "play")
      return narrator.play();
    if (t.includes("repeat")) return narrator.seek(indexRef.current);
    if (t.includes("skip ahead") || t.includes("skip forward"))
      return narrator.skipForward();
    if (t.includes("skip back") || t.includes("go back"))
      return narrator.skipBackward();
  }

  function quickNoteCat(category: string) {
    saveNote(`Flagged: ${category}`, category, true);
    setStatus(`Flagged ${category}.`);
  }

  function startCommandRecognition() {
    if (!sttSupported()) {
      setStatus("Voice commands aren't supported here — use the buttons.");
      return;
    }
    if (commandRecRef.current) return;
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) handleCommand(e.results[i][0].transcript);
      }
    };
    rec.onend = () => {
      // Auto-restart while we're idling in command mode.
      if (commandRecRef.current && phaseRef.current === "idle") {
        try {
          rec.start();
        } catch {
          /* noop */
        }
      }
    };
    rec.onerror = () => {};
    commandRecRef.current = rec;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }

  function stopCommandRecognition() {
    const rec = commandRecRef.current;
    commandRecRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
  }

  useEffect(() => {
    startCommandRecognition();
    return () => {
      stopCommandRecognition();
      captureRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exitDrive() {
    narrator.pause();
    stopCommandRecognition();
    const project = useStore.getState().projects[projectId];
    setSummary({
      minutes: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
      chapters: Math.max(
        0,
        chapterIndexOf(chapterStarts, indexRef.current) - startChapter.current,
      ),
      notes: notesCreated.current,
      bookmarks: bookmarksAdded.current,
      unresolved: project
        ? project.notes.filter((n) => !n.resolved).length
        : 0,
    });
  }

  const here = flat[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950 text-ink-50">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm uppercase tracking-widest text-accent-500">
          Drive Mode
        </span>
        <button className="btn-ghost" onClick={exitDrive}>
          <X className="h-4 w-4" /> End drive
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="max-w-2xl">
          <div className="text-sm text-ink-400">
            {here ? here.chapter.title : ""}
          </div>
          <p className="mt-3 font-serif text-2xl leading-relaxed text-ink-100">
            {here ? here.sentence.text : "—"}
          </p>
        </div>

        {phase === "idle" && (
          <div className="flex items-center gap-6">
            <button
              className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-800 hover:bg-ink-700"
              onClick={() => narrator.skipBackward()}
              aria-label="Skip backward"
            >
              <SkipBack className="h-8 w-8" />
            </button>
            <button
              className="flex h-28 w-28 items-center justify-center rounded-full bg-accent-500 text-ink-950 hover:bg-accent-400"
              onClick={() => (playing ? narrator.pause() : narrator.play())}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12" />}
            </button>
            <button
              className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-800 hover:bg-ink-700"
              onClick={() => narrator.skipForward()}
              aria-label="Skip forward"
            >
              <SkipForward className="h-8 w-8" />
            </button>
          </div>
        )}

        {phase === "idle" && (
          <button
            className="flex items-center gap-3 rounded-2xl bg-accent-500 px-10 py-6 text-2xl font-semibold text-ink-950 hover:bg-accent-400"
            onClick={startNoteCapture}
          >
            <Mic className="h-8 w-8" /> Add Note
          </button>
        )}

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 text-2xl text-red-400">
              <span className="h-4 w-4 animate-pulse rounded-full bg-red-500" />
              Recording…
            </div>
            <p className="max-w-xl font-serif text-xl text-ink-200">
              {draftText || "Speak your note."}
            </p>
            <button
              className="rounded-2xl bg-accent-500 px-10 py-6 text-2xl font-semibold text-ink-950 hover:bg-accent-400"
              onClick={finishNoteCapture}
            >
              Save Note
            </button>
          </div>
        )}

        {phase === "confirm" && (
          <div className="flex w-full max-w-xl flex-col items-center gap-4">
            <textarea
              className="field min-h-[120px] text-lg"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <select
              className="field"
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
            >
              {["Line Edit", "Dialogue", "Pacing", "Tension", "Continuity"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
            <div className="flex gap-4">
              <button
                className="rounded-xl bg-ink-800 px-8 py-4 text-lg hover:bg-ink-700"
                onClick={cancelNote}
              >
                Discard
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-4 text-lg font-semibold text-ink-950 hover:bg-accent-400"
                onClick={confirmSave}
              >
                <Check className="h-5 w-5" /> Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 text-center text-sm text-ink-400">{status}</div>

      {summary && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-sm space-y-4 border-ink-700 text-center">
            <h3 className="text-lg font-semibold text-ink-50">Drive session</h3>
            <div className="grid grid-cols-2 gap-3 text-left">
              <Stat label="Minutes" value={summary.minutes} />
              <Stat label="Chapters" value={summary.chapters} />
              <Stat label="Notes created" value={summary.notes} />
              <Stat label="Bookmarks" value={summary.bookmarks} />
            </div>
            <p className="text-sm text-ink-400">
              {summary.unresolved} unresolved revision
              {summary.unresolved === 1 ? "" : "s"} waiting for you.
            </p>
            <button className="btn-primary w-full" onClick={onExit}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function chapterIndexOf(
  starts: { index: number }[],
  flatIndex: number,
): number {
  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (flatIndex >= starts[i].index) idx = i;
  }
  return idx;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-800 px-3 py-2">
      <div className="text-2xl font-semibold text-accent-500">{value}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
