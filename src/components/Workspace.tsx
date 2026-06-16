import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store";
import { flattenSentences } from "../lib/parse";
import { Narrator, loadVoices, ttsSupported } from "../lib/speech";
import type { Anchor, Bookmark } from "../types";
import Reader from "./Reader";
import PlaybackBar from "./PlaybackBar";
import NoteComposer from "./NoteComposer";
import DriveMode from "./DriveMode";
import SettingsModal from "./SettingsModal";
import StoryBible from "./StoryBible";
import SidePanel, { type Tab } from "./SidePanel";
import {
  ArrowLeft,
  Eye,
  Car,
  Settings as SettingsIcon,
  Edit,
  X,
  Book,
} from "./icons";

export default function Workspace({ projectId }: { projectId: string }) {
  const project = useStore((s) => s.projects[projectId]);
  const setCurrent = useStore((s) => s.setCurrent);
  const setRateStore = useStore((s) => s.setRate);
  const setVoiceStore = useStore((s) => s.setVoice);
  const addBookmark = useStore((s) => s.addBookmark);

  // Depend on the manuscript, not the whole project: playback-position and
  // rate updates create a new project object every tick, and recomputing `flat`
  // on those would re-run the narrator effect and loop infinitely.
  const manuscript = project?.manuscript;
  const flat = useMemo(
    () => (manuscript ? flattenSentences(manuscript) : []),
    [manuscript],
  );

  const [currentIndex, setCurrentIndex] = useState(project?.playbackIndex ?? 0);
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [tab, setTab] = useState<Tab>("notes");
  const [readerMode, setReaderMode] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bibleOpen, setBibleOpen] = useState(false);
  // Mobile-only: the editorial panel opens as a slide-in drawer.
  const [panelOpen, setPanelOpen] = useState(false);

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
      <header className="flex items-center gap-2 border-b border-ink-800 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <button
          className="btn-icon shrink-0"
          title="Back to library"
          onClick={() => {
            narrator.pause();
            setCurrent(null);
          }}
        >
          <ArrowLeft />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-ink-50">
            {project.manuscript.title}
          </h1>
          <p className="truncate text-xs text-ink-400">
            {project.manuscript.chapters.length} chapters · {project.notes.length}{" "}
            notes
          </p>
        </div>
        <button
          className={`btn-ghost shrink-0 ${readerMode ? "border border-accent-500 text-accent-400" : ""}`}
          onClick={() => setReaderMode((v) => !v)}
          title="Hide editorial clutter and listen like a reader"
        >
          <Eye />
          <span className="hidden md:inline">
            {readerMode ? "Reader mode: on" : "Read like a reader"}
          </span>
        </button>
        <button
          className="btn-ghost shrink-0"
          onClick={() => setBibleOpen(true)}
          title="Story Bible — characters & worldbuilding"
        >
          <Book />
          <span className="hidden md:inline">Story Bible</span>
        </button>
        <button
          className="btn-ghost shrink-0"
          onClick={() => {
            narrator.pause();
            setDriveOpen(true);
          }}
          title="Hands-free review for the car"
        >
          <Car />
          <span className="hidden md:inline">Drive Mode</span>
        </button>
        <button
          className="btn-icon shrink-0"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <SettingsIcon />
        </button>
        {!readerMode && (
          <button
            className="btn-icon shrink-0 lg:hidden"
            onClick={() => setPanelOpen(true)}
            title="Notes & tools"
          >
            <Edit />
          </button>
        )}
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

        {/* Desktop: persistent sidebar. */}
        {!readerMode && (
          <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-ink-800 bg-ink-900/40 lg:flex">
            <SidePanel
              projectId={projectId}
              tab={tab}
              setTab={setTab}
              current={flatCurrent}
              onJump={(a) => narrator.seek(resolveAnchorIndex(a))}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </aside>
        )}
      </div>

      {/* Mobile: editorial panel as a slide-in drawer. */}
      {panelOpen && !readerMode && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPanelOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-ink-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
              <span className="text-sm font-semibold text-ink-200">
                Notes &amp; tools
              </span>
              <button
                className="btn-icon h-8 w-8"
                onClick={() => setPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SidePanel
                projectId={projectId}
                tab={tab}
                setTab={setTab}
                current={flatCurrent}
                onJump={(a) => {
                  narrator.seek(resolveAnchorIndex(a));
                  setPanelOpen(false);
                }}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

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

      {driveOpen && (
        <DriveMode
          projectId={projectId}
          narrator={narrator}
          flat={flat}
          currentIndex={currentIndex}
          playing={playing}
          onExit={() => setDriveOpen(false)}
        />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {bibleOpen && (
        <StoryBible projectId={projectId} onClose={() => setBibleOpen(false)} />
      )}
    </div>
  );
}
