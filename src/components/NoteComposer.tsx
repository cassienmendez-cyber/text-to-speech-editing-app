import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useStore, allCategories, EMOTIONAL_TAGS } from "../store";
import {
  VoiceCapture,
  recordingSupported,
  speak,
  sttSupported,
} from "../lib/speech";
import type { Anchor, AuthorRole, Note } from "../types";
import { Mic, Check } from "./icons";

interface Props {
  projectId: string;
  anchor: Anchor;
  contextText: string;
  playbackTimestamp?: number;
  onClose: () => void;
}

export default function NoteComposer({
  projectId,
  anchor,
  contextText,
  playbackTimestamp,
  onClose,
}: Props) {
  const addNote = useStore((s) => s.addNote);
  const passes = useStore((s) => s.projects[projectId]?.passes ?? []);
  const settings = useStore((s) => s.settings);
  const addCustomCategory = useStore((s) => s.addCustomCategory);
  const defaultRole = settings.defaultRole;
  const categories = allCategories(settings.customCategories);

  const [text, setText] = useState("");
  const [authorRole, setAuthorRole] = useState<AuthorRole>(defaultRole);
  const [category, setCategory] = useState<string>("Line Edit");
  const [tags, setTags] = useState<string[]>([]);
  const [passIds, setPassIds] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const captureRef = useRef<VoiceCapture | null>(null);
  const audioUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    return () => {
      // Ensure capture is stopped if the modal unmounts mid-recording.
      captureRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    setStatus(null);
    const capture = new VoiceCapture({
      onTranscript: (t) => setText(t),
      onError: (m) => setStatus(m),
    });
    captureRef.current = capture;
    await capture.start();
    setRecording(true);
    if (!sttSupported()) {
      setStatus("Live transcription isn't available in this browser — type your note, the audio is still recorded.");
    }
  }

  async function stopRecording() {
    const result = await captureRef.current?.stop();
    audioUrlRef.current = result?.audioUrl;
    captureRef.current = null;
    setRecording(false);
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function save() {
    if (recording) await stopRecording();
    if (!text.trim() && !audioUrlRef.current) {
      setStatus("Add a note (type or record) before saving.");
      return;
    }
    const note: Note = {
      id: nanoid(10),
      text: text.trim(),
      authorRole,
      audioUrl: audioUrlRef.current,
      createdAt: Date.now(),
      category,
      tags,
      resolved: false,
      anchor,
      contextText,
      playbackTimestamp,
      passIds,
    };
    addNote(projectId, note);
    if (settings.spokenConfirmations) speak("Note saved.");
    onClose();
  }

  function addCategory() {
    const name = prompt("New category name:");
    if (name && name.trim()) {
      addCustomCategory(name);
      setCategory(name.trim());
    }
  }

  const micAvailable = recordingSupported() || sttSupported();

  return (
    <div className="modal-scrim">
      <div className="sheet max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-50">New revision note</h3>
          <span className="chip capitalize">{anchor.level}</span>
        </div>

        <blockquote className="max-h-24 overflow-y-auto rounded-lg border-l-2 border-accent-500 bg-ink-900 px-3 py-2 text-sm italic text-ink-300">
          {contextText || "(no surrounding text)"}
        </blockquote>

        <div className="flex items-center gap-3">
          {!recording ? (
            <button
              className="btn-primary"
              onClick={startRecording}
              disabled={!micAvailable}
              title={micAvailable ? "" : "Voice capture not supported here"}
            >
              <Mic /> Record note
            </button>
          ) : (
            <button className="btn-ghost animate-pulse" onClick={stopRecording}>
              <span className="h-2 w-2 rounded-full bg-red-500" /> Stop recording
            </button>
          )}
          <span className="text-xs text-ink-400">
            {recording ? "Listening…" : "or type below"}
          </span>
        </div>

        <textarea
          className="field min-h-[90px] resize-y"
          placeholder="Your revision idea…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-ink-400">
            <span className="flex items-center justify-between">
              Category
              <button
                type="button"
                className="text-accent-400 hover:underline"
                onClick={addCategory}
              >
                + New
              </button>
            </span>
            <select
              className="field mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-400">
            As
            <select
              className="field mt-1"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value as AuthorRole)}
            >
              <option value="author">Author</option>
              <option value="editor">Editor</option>
              <option value="beta">Beta Reader</option>
            </select>
          </label>
          <div className="text-xs text-ink-400">
            Revision passes
            <div className="mt-1 flex flex-wrap gap-1">
              {passes.length === 0 && (
                <span className="text-ink-500">No passes yet</span>
              )}
              {passes.map((p) => (
                <button
                  key={p.id}
                  className={`chip ${passIds.includes(p.id) ? "border-accent-500 text-accent-400" : ""}`}
                  onClick={() => setPassIds((l) => toggle(l, p.id))}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-ink-400">
          Emotional reaction
          <div className="mt-1 flex flex-wrap gap-1">
            {EMOTIONAL_TAGS.map((t) => (
              <button
                key={t}
                className={`chip ${tags.includes(t) ? "border-accent-500 text-accent-400" : ""}`}
                onClick={() => setTags((l) => toggle(l, t))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {status && <p className="text-xs text-amber-400">{status}</p>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            <Check /> Save note
          </button>
        </div>
      </div>
    </div>
  );
}
