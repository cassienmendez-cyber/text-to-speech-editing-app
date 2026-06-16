import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store";
import { flattenSentences } from "../lib/parse";
import { Narrator, loadVoices, ttsSupported } from "../lib/speech";
import type { Anchor, Bookmark } from "../types";
import Reader from "./Reader";
import PlaybackBar from "./PlaybackBar";
import NotesPanel from "./NotesPanel";
import BookmarksPanel from "./BookmarksPanel";
import Dashboard from "./Dashboard";
import NoteComposer from "./NoteComposer";
import { ArrowLeft, Eye } from "./icons";

type Tab = "notes" | "bookmarks" | "dashboard";

export default function Workspace({ projectId }: { projectId: string }) {
  const project = useStore((s) => s.projects[projectId]);
  const setCurrent = useStore((s) => s.setCurrent);
  const setRateStore = useStore((s) => s.setRate);
  const setVoiceStore = useStore((s) => s.setVoice);
  const addBookmark = useStore((s) => s.addBookmark);

  const flat = useMemo(
    () => (project ? flattenSentences(project.manuscript) : []),
    [project],
  );

  const [currentIndex, setCurrentIndex] = useState(project?.playbackIndex ?? 0);
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [tab, setTab] = useState<Tab>("notes");
  const [readerMode, setReaderMode] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const narratorRef = useRef<Narrator | null>(null);
  if (!narratorRef.current) {
    narratorRef.current = new Narrator({
      onIndex: (i) => {
        setCurrentIndex(i);
        useStore.getState().setPlaybackIndex(projectId, i);
      },
      onState: setPlaying,
      onEnd: () => setPlaying(false),
    });
  }
  const narrator = narratorRef.current;

  // Load available TTS voices once.
  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  // Keep narrator sentences in sync with the manuscript.
  useEffect(() => {
    narrator.setSentences(flat.map((f) => f.sentence.text));
    narrator.seek(project?.playbackIndex ?? 0);
    return () => narrator.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat]);

  // Apply persisted rate / voice.
  useEffect(() => {
    if (project) narrator.setRate(project.rate);
  }, [narrator, project?.rate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!project) return;
    const v = voices.find((v) => v.voiceURI === project.voiceURI) ?? null;
    narrator.setVoice(v);
  }, [narrator, voices, project?.voiceURI]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  const flatCurrent = flat[currentIndex];
  const locationLabel = flatCurrent
    ? `${flatCurrent.chapter.title} · sentence ${currentIndex + 1} of ${flat.length}`
    : "—";

  function currentAnchor(): { anchor: Anchor; context: string } {
    const f = flat[currentIndex] ?? flat[0];
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

  function resolveAnchorIndex(anchor: Anchor): number {
    if (anchor.sentenceId) {
      const hit = flat.find((f) => f.sentence.id === anchor.sentenceId);
      if (hit) return hit.index;
    }
    if (anchor.paragraphId) {
      const hit = flat.find((f) => f.paragraph.id === anchor.paragraphId);
      if (hit) return hit.index;
    }
    const hit = flat.find((f) => f.chapter.id === anchor.chapterId);
    return hit ? hit.index : 0;
  }

  function handleBookmark() {
    const { anchor, context } = currentAnchor();
    const label = prompt("Bookmark label:", context.slice(0, 40));
    if (label === null) return;
    const bookmark: Bookmark = {
      id: nanoid(10),
      label: label.trim() || "Bookmark",
      anchor,
      contextText: context,
      createdAt: Date.now(),
    };
    addBookmark(projectId, bookmark);
  }

  const { anchor: composerAnchor, context: composerContext } = currentAnchor();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-ink-800 px-4 py-3">
        <button
          className="btn-icon"
          title="Back to library"
          onClick={() => {
            narrator.pause();
            setCurrent(null);
          }}
        >
          <ArrowLeft />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-ink-50">{project.manuscript.title}</h1>
          <p className="text-xs text-ink-400">
            {project.manuscript.chapters.length} chapters · {project.notes.length}{" "}
            notes
          </p>
        </div>
        <button
          className={`btn-ghost ${readerMode ? "border border-accent-500 text-accent-400" : ""}`}
          onClick={() => setReaderMode((v) => !v)}
          title="Hide editorial clutter and listen like a reader"
        >
          <Eye /> {readerMode ? "Reader mode: on" : "Read like a reader"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Reader
            manuscript={project.manuscript}
            flat={flat}
            currentIndex={currentIndex}
            notes={project.notes}
            readerMode={readerMode}
            onSeek={(i) => narrator.seek(i)}
          />
        </main>

        {!readerMode && (
          <aside className="flex w-[22rem] shrink-0 flex-col border-l border-ink-800 bg-ink-900/40">
            <div className="flex border-b border-ink-800 text-sm">
              {(["notes", "bookmarks", "dashboard"] as Tab[]).map((t) => (
                <button
                  key={t}
                  className={`flex-1 py-2 capitalize ${
                    tab === t
                      ? "border-b-2 border-accent-500 text-accent-400"
                      : "text-ink-400 hover:text-ink-200"
                  }`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {tab === "notes" && (
                <NotesPanel
                  projectId={projectId}
                  onJump={(a) => narrator.seek(resolveAnchorIndex(a))}
                />
              )}
              {tab === "bookmarks" && (
                <BookmarksPanel
                  projectId={projectId}
                  onJump={(a) => narrator.seek(resolveAnchorIndex(a))}
                />
              )}
              {tab === "dashboard" && <Dashboard projectId={projectId} />}
            </div>
          </aside>
        )}
      </div>

      <PlaybackBar
        playing={playing}
        rate={project.rate}
        voices={voices}
        voiceURI={project.voiceURI}
        locationLabel={locationLabel}
        ttsAvailable={ttsSupported()}
        onPlay={() => narrator.play()}
        onPause={() => narrator.pause()}
        onStop={() => narrator.stop()}
        onSkipBack={() => narrator.skipBackward()}
        onSkipForward={() => narrator.skipForward()}
        onRepeat={() => narrator.seek(currentIndex)}
        onRate={(r) => setRateStore(projectId, r)}
        onVoice={(uri) => setVoiceStore(projectId, uri)}
        onAddNote={() => {
          narrator.pause();
          setComposerOpen(true);
        }}
        onBookmark={handleBookmark}
      />

      {composerOpen && (
        <NoteComposer
          projectId={projectId}
          anchor={composerAnchor}
          contextText={composerContext}
          playbackTimestamp={currentIndex}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
}
