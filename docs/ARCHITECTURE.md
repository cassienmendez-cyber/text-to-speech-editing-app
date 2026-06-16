# Architecture & Technical Recommendations

StoryScribe favors a **local-first architecture** wherever possible. Manuscript
content stays on the author's device by default, and no manuscript content is
processed externally without explicit permission.

---

## Recommended Stack

| Layer | Recommendation |
| --- | --- |
| Desktop framework | Tauri (preferred) |
| Frontend | React · TypeScript · Tailwind CSS |
| Backend | Python |
| Speech-to-Text | Whisper / local Whisper models |
| Text-to-Speech | ElevenLabs · OpenAI voices · local alternatives |
| AI integration | Claude API |

---

## Design Principles

### Local-first

- Manuscripts, notes, recordings, and revision history persist locally.
- Offline functionality is a requirement, not an enhancement: listening, note
  creation, voice recording, bookmarking, and revision organization all work
  without a connection.
- Synchronization occurs automatically when internet access returns.

### Privacy by default

- Provide options for local speech transcription and local text-to-speech.
- Provide the option to disable AI entirely.
- External processing of manuscript content requires explicit opt-in.

### Author control over AI

- AI never modifies manuscript text automatically.
- Every AI-generated revision requires explicit author approval.
- AI operates only in the mode the author selects: OFF, SUGGEST, ANALYZE, or
  COLLABORATE.

---

## Core Domain Model (conceptual)

These are the primary entities the application revolves around. They are
described conceptually here; concrete schemas will follow during
implementation.

- **Project / Manuscript** — Imported document preserving chapters, paragraphs,
  and scene breaks. Autosaves continuously.
- **PlaybackPosition** — Persisted listening progress per project.
- **Note** — Text transcription, original voice recording, creation date,
  chapter/paragraph/sentence references, playback timestamp, and surrounding
  context. Carries a category, optional emotional tags, resolution state, and
  pass assignments.
- **Anchor** — The manuscript location a note attaches to, at sentence,
  paragraph, scene, or chapter level. Relocatable without deleting the note.
- **Bookmark** — Independently searchable saved location, distinct from notes.
- **RevisionPass** — A named editing pass (e.g. Tension Pass). Notes may belong
  to one or many passes.
- **Revision** — An accepted change record: original text, revised text, date
  accepted, source of change, and associated note. Restorable.
- **Category** — Built-in or custom classification for notes.
- **CharacterProfile / WorldElement** — The story bible. Character profiles
  (physical, personality, relationships, fears, motivations, background) and
  worldbuilding rules (by category: magic system, timeline, creatures, social
  structure, …). The AI assistant references these during analysis and
  continuity checks.

---

## Key Subsystems

- **Import pipeline** — DOCX (mammoth), EPUB (jszip, spine order), PDF (pdfjs, geometry-based paragraphing), TXT. Normalizes structure
  into the domain model.
- **Playback engine** — TTS narration with speed control (0.75×–2×), voice
  selection, sentence highlighting, and 15-second skip controls.
- **Capture pipeline** — Voice recording → speech-to-text transcription →
  note creation with preserved original audio and manuscript anchoring.
- **Drive Mode** — Constrained, hands-free interface with wake phrases, voice
  commands, confidence settings, and quick/emergency capture. See
  [DRIVE_MODE.md](DRIVE_MODE.md).
- **Revision intelligence** — Dashboard, passes, emotional-tag trends, and the
  AI editorial assistant.
- **AI assistant** (`src/lib/ai.ts`) — Calls the Claude API (`claude-opus-4-8`)
  via `@anthropic-ai/sdk` with the author's own key, directly from the browser
  and only when explicitly enabled. Provides SUGGEST (rewrite), ANALYZE
  (developmental insight, adaptive thinking), pattern recognition, and
  continuity checking against the story bible (`src/lib/bible.ts` assembles the
  character/world context). Every rewrite requires explicit approval before it
  touches the manuscript; accepted changes are recorded as restorable
  `Revision` entries.
- **Story bible** (`src/components/StoryBible.tsx`) — CRUD for character
  profiles and worldbuilding elements, persisted per project; surfaced to the
  AI assistant as reference context.
- **Real-time collaboration** (`src/lib/collab.ts`, `src/collab-context.tsx`) —
  a Yjs CRDT binds the shared project (manuscript + notes/bookmarks/characters/
  world/passes/revisions) and syncs it peer-to-peer over WebRTC (y-webrtc),
  with optional passphrase E2E encryption. The CRDT binding is transport-
  agnostic and unit-tested; playback position/rate/voice stay per-user. Loaded
  on demand to keep Yjs/y-webrtc out of the main bundle.
- **Desktop shell** (`src-tauri/`) — A Tauri wrapper that loads the same React
  frontend (`frontendDist: ../dist`) as a local-first native app. Building it
  requires the Tauri/WebKitGTK system prerequisites.
- **Sync layer** — Local-first persistence with automatic background sync
  (currently `localStorage` via the Zustand persist middleware).
