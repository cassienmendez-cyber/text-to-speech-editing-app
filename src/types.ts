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
  source: "txt" | "docx" | "epub" | "pdf";
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

/** Who authored a note — keeps author/editor/beta-reader feedback distinct. */
export type AuthorRole = "author" | "editor" | "beta";

export interface Note {
  id: string;
  text: string;
  /** Author / Editor / Beta Reader — defaults to "author". */
  authorRole: AuthorRole;
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

/** An accepted (or restorable) change to the manuscript. */
export interface Revision {
  id: string;
  originalText: string;
  revisedText: string;
  dateAccepted: number;
  /** Where the change came from. */
  source: "ai-suggest" | "ai-collaborate" | "manual";
  noteId?: string;
  chapterId: string;
  paragraphId: string;
  /** True while currently applied to the manuscript (false after a restore). */
  applied: boolean;
}

/** A character profile in the story bible. AI may reference these. */
export interface CharacterProfile {
  id: string;
  name: string;
  /** Comma/newline-separated nicknames or alternate names (also matched). */
  aliases: string;
  /** Role or one-line summary (e.g. "Protagonist", "Antagonist's sister"). */
  role: string;
  physical: string;
  personality: string;
  relationships: string;
  fears: string;
  motivations: string;
  background: string;
  createdAt: number;
  updatedAt: number;
}

export type WorldCategory =
  | "Magic System"
  | "History / Timeline"
  | "Creatures"
  | "Social Structure"
  | "Geography"
  | "Technology"
  | "Other";

/** A worldbuilding rule/element. AI can flag continuity issues against these. */
export interface WorldElement {
  id: string;
  name: string;
  category: WorldCategory;
  /** The rules / facts that must stay consistent. */
  rules: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  manuscript: Manuscript;
  notes: Note[];
  bookmarks: Bookmark[];
  passes: RevisionPass[];
  revisions: Revision[];
  characters: CharacterProfile[];
  world: WorldElement[];
  /** Persisted listening position: index into the flattened sentence list. */
  playbackIndex: number;
  /** Author-selected narration settings. */
  rate: number;
  voiceURI?: string;
}

export type AIMode = "off" | "suggest" | "analyze" | "collaborate";

export type DrivingConfidence = "beginner" | "standard" | "expert";

/** Application-wide settings (local to this device). */
export interface Settings {
  /** The author's own Anthropic API key. Stored locally; never sent anywhere
   *  except directly to the Anthropic API when AI is explicitly enabled. */
  apiKey: string;
  aiMode: AIMode;
  drivingConfidence: DrivingConfidence;
  wakePhrase: string;
  /** Default role applied to new notes (author / editor / beta reader). */
  defaultRole: AuthorRole;
  /** Author-created note categories, in addition to the built-in ones. */
  customCategories: string[];
  /** Accessibility: high-contrast theme. */
  highContrast: boolean;
  /** Accessibility: speak short confirmations after key actions. */
  spokenConfirmations: boolean;
  /** Color theme id (ember / halloween / ocean / irish / rainbow / …). */
  theme: string;
  /** Reader font scale (1 = default). Adjusted with the A−/A+ controls. */
  fontScale: number;
}

/** A flattened, ordered reference to a sentence and its location. */
export interface FlatSentence {
  index: number;
  sentence: Sentence;
  chapter: Chapter;
  paragraph: Paragraph;
}
