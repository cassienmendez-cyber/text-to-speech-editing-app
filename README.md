# StoryScribe

> **StoryScribe helps writers revise stories wherever stories happen.**

StoryScribe is an **audio-first revision companion** for authors. It transforms
passive listening into active editing by letting writers listen to their
manuscripts like an audiobook, capture revision ideas through voice, organize
that feedback intelligently, and implement changes with AI-assisted support —
all while keeping the author in complete control.

StoryScribe is **not** an AI writing tool. It is a trusted editor riding
shotgun through every stage of revision.

---

## Core Philosophy

The author remains the storyteller. StoryScribe exists to:

- Capture ideas before they disappear.
- Reduce friction during revision.
- Preserve creative momentum.
- Make editing accessible outside traditional writing sessions.
- Provide editorial assistance without replacing the author's voice.

**All AI-generated content requires explicit author approval before modifying
manuscript text.**

---

## North Star Experience

A writer can:

1. Upload a manuscript.
2. Listen to it like an audiobook.
3. Capture revision ideas instantly through speech.
4. Continue their daily life while editing.
5. Return later to organized, contextual revision notes.
6. Implement revisions efficiently with AI support.

---

## Documentation

| Document | Description |
| --- | --- |
| [Product Specification](docs/PRODUCT_SPEC.md) | The complete, canonical product spec. |
| [Roadmap](docs/ROADMAP.md) | Phased delivery plan (MVP → Editorial Intelligence). |
| [Architecture](docs/ARCHITECTURE.md) | Technical stack, local-first design, and component breakdown. |
| [Drive Mode](docs/DRIVE_MODE.md) | Hands-free, eyes-on-the-road revision capture. |
| [Glossary](docs/GLOSSARY.md) | Shared vocabulary for notes, passes, anchors, and modes. |

---

## Primary Users

Novelists · thriller, horror, fantasy, and romance authors · self-published and
traditionally published authors · screenwriters · developmental editors.

---

## Guiding Principle

Every feature should answer one question:

> **"Does this help writers revise stories more naturally and with less
> friction?"**

If the answer is yes, build it. If the answer is no, remove it.

---

## Getting Started

StoryScribe is a local-first web app built with **Vite + React + TypeScript +
Tailwind CSS**. It uses the browser's native Web Speech API for text-to-speech
narration and voice-note transcription, so no API keys are required and no
manuscript content leaves your device.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and produce a production build in dist/
npm run preview  # preview the production build
```

> **Browser note:** TTS narration and live voice transcription rely on the Web
> Speech API, best supported in Chromium-based browsers (Chrome/Edge). The app
> degrades gracefully where unsupported — you can still import, read, type
> notes, bookmark, and use the dashboard.

### Mobile & install (PWA)

StoryScribe is fully responsive and works as an installable Progressive Web App
— **everything you can do on the desktop, you can do on a phone**:

- Responsive layout throughout: the editorial panel (Notes / Bookmarks /
  Dashboard / AI) becomes a slide-in drawer on small screens, the playback bar
  reflows, and the header collapses to touch-friendly icons.
- Installable to the home screen (manifest + service worker) with an offline
  app shell, standalone display, and iOS safe-area handling.
- Drive Mode's oversized, hands-free controls are designed for phone-in-the-car
  use.

To install: open the app in a mobile browser and choose **Add to Home Screen**.
Icons are generated with `npm run icons` (re-run if you change the artwork).

### Try it in 30 seconds

1. Run `npm run dev` and open the app.
2. Click **Load sample manuscript** (or import your own DOCX/TXT).
3. Press **Play** to hear it narrated with the active sentence highlighted.
4. Press **Add note** to capture a revision idea by voice or text.
5. Explore the **Notes**, **Bookmarks**, and **Dashboard** tabs, or toggle
   **Read like a reader** to hide editorial clutter.

## Implemented

**Phase 1 — capture (MVP)**

- DOCX + TXT import (chapters, paragraphs, and scene breaks preserved)
- Audiobook playback with play / pause / stop, 15s skip, repeat, speed
  (0.75×–2×), and voice selection
- Live sentence highlighting and persisted listening position
- Voice + text revision notes with preserved audio, categories, emotional tags,
  and surrounding context
- Sentence-level note anchoring with "go to location"
- Google-Docs-style comment system: edit, resolve/reopen, delete, replay audio
- Bookmarks (independently searchable)
- Revision passes and a revision dashboard (category distribution, reaction
  trends, resolution stats)
- "Read like a reader" mode
- Continuous autosave to local storage (offline-friendly)
- **Drive Mode** — hands-free, eyes-on-the-road review: oversized controls,
  customizable wake phrase, voice commands (pause/resume, skip, next/previous
  chapter, add note, bookmark, flag pacing/continuity/character), quick capture,
  beginner/standard/expert confidence settings, and a drive-session summary

**Phase 2 — revision intelligence (partial)**

- **AI editorial assistant** (optional, off by default) — OFF / SUGGEST /
  ANALYZE / COLLABORATE modes powered by the Claude API using *your own* key:
  rewrite suggestions, developmental analysis, and note-pattern recognition.
  **AI never changes your text without explicit approval** — every rewrite is
  surfaced for accept / reject / edit, and accepted changes are tracked in
  restorable revision history.

**Phase 3 — editorial intelligence (partial)**

- **Story Bible** — a Character database (name, role, physical, personality,
  relationships, fears, motivations, background) and a Worldbuilding database
  (magic systems, timelines, creatures, social structures, …). The AI assistant
  references these profiles during analysis, and a **Continuity check** flags
  contradictions between a passage and your established characters/world rules.

**Desktop**

- A **Tauri** shell (`src-tauri/`) wraps the exact same React frontend as a
  local-first desktop app.

See the [Roadmap](docs/ROADMAP.md) for what's next, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it's built.

## Desktop build (Tauri)

The web frontend doubles as the desktop UI. To run it as a native app you need
the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust, and on
Linux the WebKitGTK/`webkit2gtk-4.1` system libraries):

```bash
npm run tauri icon path/to/source.png   # one-time: generate app icons
npm run tauri dev                        # run the desktop app
npm run tauri build                      # produce installers
```

> The desktop build requires native system libraries and is not exercised by
> the web `npm run dev` flow.

## AI assistant setup

The AI assistant is **opt-in**. Open **Settings** (gear icon), choose an AI mode
(Suggest / Analyze / Collaborate), and paste your Anthropic API key. The key is
stored locally on your device and is sent only to the Anthropic API, and only
when you run an AI action. Leave AI **Off** to keep everything fully local. The
assistant uses the `claude-opus-4-8` model via `@anthropic-ai/sdk`.

## Project Structure

```
src/
  lib/
    parse.ts     # text -> chapters/paragraphs/sentences; flatten for playback
    import.ts    # DOCX/TXT import (mammoth)
    speech.ts    # TTS Narrator + voice-note capture (Web Speech API)
    ai.ts        # AI editorial assistant (Anthropic SDK, claude-opus-4-8)
  components/    # Library, Workspace, Reader, PlaybackBar, NotesPanel,
                 #   DriveMode, AIPanel, SettingsModal, ...
  store.ts       # Zustand store with autosave persistence + settings
  types.ts       # core domain model
src-tauri/       # Tauri desktop shell (Rust)
docs/            # product spec, roadmap, architecture, drive mode, glossary
```
