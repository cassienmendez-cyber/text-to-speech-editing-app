// Core domain model for StoryScribe.
// See docs/ARCHITECTURE.md for the conceptual overview.

export interface Sentence {
  id: string;
  text: string;
}

export interface Paragraph {
  id: string;
  sentences: Sentence[];
  /** Marks a scene break that followed this paragraph. */
  sceneBreakAfter?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}

export interface Manuscript {
  id: string;
  title: string;
  chapters: Chapter[];
  createdAt: number;
  updatedAt: number;
  /** Source format the manuscript was imported from. */
  source: "txt" | "docx";
}

export type AnchorLevel = "sentence" | "paragraph" | "scene" | "chapter";

/** Where in the manuscript a note (or bookmark) is anchored. */
export interface Anchor {
  level: AnchorLevel;
  chapterId: string;
  paragraphId?: string;
  sentenceId?: string;
}

export type NoteCategory =
  | "Line Edit"
  | "Dialogue"
  | "Pacing"
  | "Tension"
  | "Character Development"
  | "Worldbuilding"
  | "Continuity"
  | "Research"
  | "Plot Hole"
  | "Delete Section"
  | "Favorite Passage"
  | string; // custom categories permitted

export type EmotionalTag =
  | "Exciting"
  | "Funny"
  | "Scary"
  | "Emotional"
  | "Slow"
  | "Confusing"
  | string;

export interface Note {
  id: string;
  text: string;
  /** Object URL / data URL for the preserved original voice recording. */
  audioUrl?: string;
  createdAt: number;
  category: NoteCategory;
  tags: EmotionalTag[];
  resolved: boolean;
  anchor: Anchor;
  /** Surrounding manuscript text captured at creation time. */
  contextText: string;
  /** Playback timestamp (seconds into the session) when captured. */
  playbackTimestamp?: number;
  /** Revision passes this note belongs to. */
  passIds: string[];
  /** True when captured as a Quick Note into the Inbox. */
  inbox?: boolean;
}

export interface Bookmark {
  id: string;
  label: string;
  anchor: Anchor;
  contextText: string;
  createdAt: number;
}

export interface RevisionPass {
  id: string;
  name: string;
  createdAt: number;
}

export interface Project {
  manuscript: Manuscript;
  notes: Note[];
  bookmarks: Bookmark[];
  passes: RevisionPass[];
  /** Persisted listening position: index into the flattened sentence list. */
  playbackIndex: number;
  /** Author-selected narration settings. */
  rate: number;
  voiceURI?: string;
}

/** A flattened, ordered reference to a sentence and its location. */
export interface FlatSentence {
  index: number;
  sentence: Sentence;
  chapter: Chapter;
  paragraph: Paragraph;
}
