# StoryScribe — Master Product Specification

- **Product Name:** StoryScribe
- **Document type:** Master product specification
- **Status:** Canonical reference

---

## Mission Statement

StoryScribe helps writers revise stories wherever stories happen.

The application transforms passive listening into active editing by allowing
authors to listen to their manuscripts, capture revision ideas through voice,
organize feedback intelligently, and implement changes with AI-assisted support
while maintaining complete author control.

StoryScribe is **not** an AI writing tool. It is an **audio-first revision
companion** designed specifically for authors.

---

## Core Philosophy

The author remains the storyteller. StoryScribe exists to:

- Capture ideas before they disappear.
- Reduce friction during revision.
- Preserve creative momentum.
- Make editing accessible outside traditional writing sessions.
- Provide editorial assistance without replacing the author's voice.

**All AI-generated content must require explicit author approval before
modifying manuscript text.**

---

## Primary Users

- Novelists
- Thriller authors
- Horror writers
- Fantasy authors
- Romance authors
- Self-published authors
- Traditionally published authors
- Screenwriters
- Developmental editors

---

## North Star Experience

A writer can:

- Upload a manuscript.
- Listen to it like an audiobook.
- Capture revision ideas instantly through speech.
- Continue their daily life while editing.
- Return later to organized, contextual revision notes.
- Implement revisions efficiently with AI support.

---

## Core Features

### Manuscript Import

**Supported MVP formats:**

- DOCX
- TXT

**Future support:**

- EPUB
- PDF

Imported manuscripts should preserve:

- Chapters
- Paragraph structure
- Scene breaks

Projects should autosave continuously.

### Audiobook Playback

The manuscript should be readable using natural text-to-speech.

**Features:**

- Play
- Pause
- Resume
- Stop
- Skip forward 15 seconds
- Skip backward 15 seconds
- Repeat sentence
- Repeat paragraph
- Adjustable narration speed (0.75× to 2×)
- Voice selection

**While listening:**

- Active sentences should highlight.
- Current location should remain visible.
- Listening progress should persist between sessions.

### Contextual Revision Notes

Users can create revision notes through voice or text.

**Workflow:**

1. User pauses playback.
2. StoryScribe identifies the active manuscript location.
3. User records a spoken note.
4. Speech converts into text.
5. Original audio is preserved.
6. Note attaches to the manuscript.

**Each note stores:**

- Text transcription
- Original voice recording
- Creation date
- Chapter reference
- Paragraph reference
- Sentence reference
- Playback timestamp
- Surrounding manuscript context

### Flexible Note Anchoring

Notes should attach to multiple levels:

- Sentence
- Paragraph
- Scene
- Chapter

Users can relocate notes without deleting them, via:

- Drag and drop
- Reattach command
- Move-to-location interface

### Comment System

Comments function similarly to Google Docs. Users can:

- Edit notes
- Delete notes
- Resolve notes
- Reopen notes
- Reassign categories
- Move notes
- Replay original recordings

### Revision Categories

Users can classify notes. Suggested categories:

- Line Edit
- Dialogue
- Pacing
- Tension
- Character Development
- Worldbuilding
- Continuity
- Research
- Plot Hole
- Delete Section
- Favorite Passage

Users may create custom categories.

### Emotional Reaction Tags

Users may quickly tag reactions. Examples:

- Exciting
- Funny
- Scary
- Emotional
- Slow
- Confusing

StoryScribe may identify trends based on these reactions.

### Bookmarks

Bookmarks differ from revision notes. Bookmarks allow users to save:

- Favorite scenes
- Powerful moments
- Passages requiring reflection
- Future expansion opportunities

Bookmarks remain independently searchable.

### Revision Pass System

Users organize revisions into editing passes. Examples:

- First Draft Cleanup
- Tension Pass
- Dialogue Pass
- Character Arc Pass
- Continuity Pass
- Final Polish Pass

Notes may belong to one or multiple passes. This enables structured revision
workflows.

### Revision Dashboard

The dashboard displays:

- Total chapters
- Total notes
- Resolved notes
- Unresolved notes
- Category distribution
- Pass assignments
- Emotional reaction trends

Users may filter by:

- Chapter
- Scene
- Category
- Revision pass
- Resolution status

### Read Like a Reader Mode

This mode removes editorial clutter. Hidden elements:

- Comments
- Analytics
- Revision indicators

The manuscript becomes an uninterrupted listening experience, allowing authors
to experience the story from a reader's perspective.

### Offline Functionality

Offline support is **required**. Users should be able to:

- Listen to downloaded manuscripts
- Create notes
- Record voice comments
- Create bookmarks
- Organize revisions

Synchronization occurs automatically when internet access returns.

---

## AI Editorial Assistant

AI acts as an editorial collaborator. **AI never modifies manuscript text
automatically.**

**AI Modes:**

- **OFF** — No processing occurs.
- **SUGGEST** — Generate rewrite suggestions.
- **ANALYZE** — Provide developmental insights.
- **COLLABORATE** — Assist with selected revisions.

### AI Revision Suggestions

AI can access:

- Selected manuscript sections
- Associated notes
- Nearby context

Users may accept, reject, or manually edit suggestions. **All revisions require
approval.**

### Batch Revision Assistance

Examples:

- Review all pacing notes.
- Generate suggestions for Chapter 6.
- Address unresolved dialogue comments.

Suggestions remain optional.

### Editorial Pattern Analysis

AI identifies recurring themes. Examples:

- Frequent pacing concerns
- Character inconsistency trends
- Common tension issues

Outputs include:

- Revision summaries
- Priority recommendations
- Developmental editing observations

### Revision History

All accepted revisions should be tracked. Stored information:

- Original text
- Revised text
- Date accepted
- Source of change
- Associated note

Users may restore previous versions.

---

## Future Features

### Character Database

Users can build character profiles. Examples:

- Physical descriptions
- Relationships
- Fears
- Motivations
- Background details

AI may reference these profiles during analysis.

### Worldbuilding Database

Users can define world rules. Examples:

- Magic systems
- Historical timelines
- Creature limitations
- Social structures

AI can flag potential continuity issues.

### Beta Reader Support

Allow external reviewers to contribute notes, with separate categories:

- Author Notes
- Editor Notes
- Beta Reader Notes

All feedback remains distinguishable.

---

## Drive Mode

See the dedicated [Drive Mode specification](DRIVE_MODE.md) for full detail.

**Purpose:** Enable safe manuscript review during commutes.

**Core principle:** Eyes on the road. Hands on the wheel. Capture the thought
before it disappears.

---

## Accessibility Requirements

Support:

- Adjustable narration speed
- Multiple voice options
- Large controls
- High-contrast themes
- Spoken confirmations
- Reduced confirmation settings

---

## Privacy Principles

Users own their manuscripts. StoryScribe should prioritize privacy. Users
should have options for:

- Local speech transcription
- Local text-to-speech
- Disabling AI entirely

**No manuscript content should be processed externally without explicit
permission.**

---

## Final Product Principle

Every feature should answer one question:

> **"Does this help writers revise stories more naturally and with less
> friction?"**

If the answer is yes, build it. If the answer is no, remove it.

StoryScribe should feel less like software and more like a trusted editor
riding shotgun through every stage of revision.
