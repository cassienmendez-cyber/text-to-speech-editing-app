import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { splitSentences } from "./lib/parse";
import type {
  Bookmark,
  Manuscript,
  Note,
  Project,
  Revision,
  RevisionPass,
  Settings,
} from "./types";

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  aiMode: "off",
  drivingConfidence: "standard",
  wakePhrase: "hey storyscribe",
};

interface AppState {
  projects: Record<string, Project>;
  currentId: string | null;
  settings: Settings;

  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  // Project lifecycle
  addProject: (manuscript: Manuscript) => string;
  removeProject: (id: string) => void;
  setCurrent: (id: string | null) => void;
  current: () => Project | null;

  // Revisions (AI-assisted or manual edits to the manuscript)
  addRevision: (projectId: string, revision: Revision) => void;
  setRevisionApplied: (
    projectId: string,
    revisionId: string,
    applied: boolean,
  ) => void;
  /** Replace a paragraph's text, re-splitting it into sentences. */
  replaceParagraphText: (
    projectId: string,
    chapterId: string,
    paragraphId: string,
    newText: string,
  ) => void;

  // Notes
  addNote: (projectId: string, note: Note) => void;
  updateNote: (projectId: string, noteId: string, patch: Partial<Note>) => void;
  deleteNote: (projectId: string, noteId: string) => void;

  // Bookmarks
  addBookmark: (projectId: string, bookmark: Bookmark) => void;
  deleteBookmark: (projectId: string, bookmarkId: string) => void;

  // Revision passes
  addPass: (projectId: string, name: string) => void;
  deletePass: (projectId: string, passId: string) => void;

  // Playback / narration settings (persisted listening progress)
  setPlaybackIndex: (projectId: string, index: number) => void;
  setRate: (projectId: string, rate: number) => void;
  setVoice: (projectId: string, voiceURI: string | undefined) => void;
}

function touch(manuscript: Manuscript): Manuscript {
  return { ...manuscript, updatedAt: Date.now() };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: {},
      currentId: null,
      settings: DEFAULT_SETTINGS,

      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),

      addProject: (manuscript) => {
        const project: Project = {
          manuscript,
          notes: [],
          bookmarks: [],
          passes: [
            { id: nanoid(8), name: "First Draft Cleanup", createdAt: Date.now() },
          ],
          revisions: [],
          playbackIndex: 0,
          rate: 1,
        };
        set((s) => ({
          projects: { ...s.projects, [manuscript.id]: project },
          currentId: manuscript.id,
        }));
        return manuscript.id;
      },

      removeProject: (id) =>
        set((s) => {
          const next = { ...s.projects };
          delete next[id];
          return {
            projects: next,
            currentId: s.currentId === id ? null : s.currentId,
          };
        }),

      setCurrent: (id) => set({ currentId: id }),

      current: () => {
        const { projects, currentId } = get();
        return currentId ? projects[currentId] ?? null : null;
      },

      addRevision: (projectId, revision) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: { ...p, revisions: [revision, ...p.revisions] },
            },
          };
        }),

      setRevisionApplied: (projectId, revisionId, applied) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                revisions: p.revisions.map((r) =>
                  r.id === revisionId ? { ...r, applied } : r,
                ),
              },
            },
          };
        }),

      replaceParagraphText: (projectId, chapterId, paragraphId, newText) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          const sentences = splitSentences(newText).map((text) => ({
            id: nanoid(8),
            text,
          }));
          const manuscript: Manuscript = {
            ...p.manuscript,
            updatedAt: Date.now(),
            chapters: p.manuscript.chapters.map((c) =>
              c.id !== chapterId
                ? c
                : {
                    ...c,
                    paragraphs: c.paragraphs.map((para) =>
                      para.id !== paragraphId
                        ? para
                        : { ...para, sentences },
                    ),
                  },
            ),
          };
          return {
            projects: { ...s.projects, [projectId]: { ...p, manuscript } },
          };
        }),

      addNote: (projectId, note) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                notes: [note, ...p.notes],
                manuscript: touch(p.manuscript),
              },
            },
          };
        }),

      updateNote: (projectId, noteId, patch) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                notes: p.notes.map((n) =>
                  n.id === noteId ? { ...n, ...patch } : n,
                ),
                manuscript: touch(p.manuscript),
              },
            },
          };
        }),

      deleteNote: (projectId, noteId) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                notes: p.notes.filter((n) => n.id !== noteId),
                manuscript: touch(p.manuscript),
              },
            },
          };
        }),

      addBookmark: (projectId, bookmark) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: { ...p, bookmarks: [bookmark, ...p.bookmarks] },
            },
          };
        }),

      deleteBookmark: (projectId, bookmarkId) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                bookmarks: p.bookmarks.filter((b) => b.id !== bookmarkId),
              },
            },
          };
        }),

      addPass: (projectId, name) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          const pass: RevisionPass = {
            id: nanoid(8),
            name,
            createdAt: Date.now(),
          };
          return {
            projects: {
              ...s.projects,
              [projectId]: { ...p, passes: [...p.passes, pass] },
            },
          };
        }),

      deletePass: (projectId, passId) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: {
                ...p,
                passes: p.passes.filter((pass) => pass.id !== passId),
                notes: p.notes.map((n) => ({
                  ...n,
                  passIds: n.passIds.filter((id) => id !== passId),
                })),
              },
            },
          };
        }),

      setPlaybackIndex: (projectId, index) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: {
              ...s.projects,
              [projectId]: { ...p, playbackIndex: index },
            },
          };
        }),

      setRate: (projectId, rate) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: { ...s.projects, [projectId]: { ...p, rate } },
          };
        }),

      setVoice: (projectId, voiceURI) =>
        set((s) => {
          const p = s.projects[projectId];
          if (!p) return s;
          return {
            projects: { ...s.projects, [projectId]: { ...p, voiceURI } },
          };
        }),
    }),
    {
      name: "storyscribe-v1",
      version: 2,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2) {
          // Ensure every project has a revisions array and settings exist.
          const projects = persisted.projects ?? {};
          for (const id of Object.keys(projects)) {
            if (!projects[id].revisions) projects[id].revisions = [];
          }
          persisted.settings = { ...DEFAULT_SETTINGS, ...persisted.settings };
        }
        return persisted;
      },
    },
  ),
);

/** Built-in revision categories (authors may add custom ones). */
export const DEFAULT_CATEGORIES = [
  "Line Edit",
  "Dialogue",
  "Pacing",
  "Tension",
  "Character Development",
  "Worldbuilding",
  "Continuity",
  "Research",
  "Plot Hole",
  "Delete Section",
  "Favorite Passage",
];

export const EMOTIONAL_TAGS = [
  "Exciting",
  "Funny",
  "Scary",
  "Emotional",
  "Slow",
  "Confusing",
];
