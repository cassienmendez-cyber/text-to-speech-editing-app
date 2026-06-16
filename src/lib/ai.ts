import Anthropic from "@anthropic-ai/sdk";
import type { Note } from "../types";

// The AI editorial assistant. It runs against the Anthropic API using the
// author's own key, called directly from the browser only when AI is explicitly
// enabled. AI never modifies manuscript text on its own — every result is
// surfaced for explicit author approval.

const MODEL = "claude-opus-4-8";

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** Pull plain text out of a response, ignoring thinking blocks. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

const VOICE_GUARD =
  "You are an editorial collaborator for a novelist using StoryScribe. " +
  "You assist with revision; you never replace the author's voice. " +
  "Preserve the author's style, tone, vocabulary, and intent. " +
  "Make the smallest change that addresses the note. Never invent plot, " +
  "characters, or facts the author did not write.";

function notesBlock(notes: Note[]): string {
  if (notes.length === 0) return "(no notes attached to this passage)";
  return notes
    .map(
      (n, i) =>
        `${i + 1}. [${n.category}${n.tags.length ? ", " + n.tags.join("/") : ""}] ${n.text || "(voice note — no transcript)"}`,
    )
    .join("\n");
}

export interface SuggestInput {
  apiKey: string;
  passageText: string;
  notes: Note[];
  context: string;
}

/** SUGGEST mode: produce a single revised version of the passage. Returns the
 *  revised prose only, ready for the author to accept, reject, or edit. */
export async function suggestRewrite(
  input: SuggestInput,
): Promise<string> {
  const msg = await client(input.apiKey).messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      VOICE_GUARD +
      " Return ONLY the revised passage as plain prose — no preamble, no " +
      "explanation, no quotation marks around the whole thing.",
    messages: [
      {
        role: "user",
        content:
          `Surrounding context (for reference only, do not rewrite):\n${input.context}\n\n` +
          `Passage to revise:\n"""\n${input.passageText}\n"""\n\n` +
          `Revision notes to address:\n${notesBlock(input.notes)}\n\n` +
          `Rewrite the passage to address the notes while preserving the author's voice.`,
      },
    ],
  });
  return textOf(msg);
}

function bibleBlock(bible?: string): string {
  return bible && bible.trim()
    ? `\n\nStory bible (characters and world rules to stay consistent with):\n${bible}\n`
    : "";
}

export interface AnalyzeInput {
  apiKey: string;
  title: string;
  passageText: string;
  notes: Note[];
  /** Optional story-bible context (characters + world rules). */
  bible?: string;
}

/** ANALYZE mode: developmental insights for a section. Returns a readable
 *  editorial assessment — observations, not rewrites. Uses adaptive thinking
 *  because this is a reasoning-heavy task. */
export async function analyzePassage(
  input: AnalyzeInput,
): Promise<string> {
  const msg = await client(input.apiKey).messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system:
      VOICE_GUARD +
      " In ANALYZE mode you do not rewrite. Provide developmental editorial " +
      "observations: pacing, tension, character, continuity, and clarity. " +
      "Be specific and constructive. Use short markdown sections.",
    messages: [
      {
        role: "user",
        content:
          `Chapter: ${input.title}\n\n` +
          `Passage:\n"""\n${input.passageText}\n"""\n\n` +
          `Author's notes on this section:\n${notesBlock(input.notes)}` +
          bibleBlock(input.bible) +
          `\nGive a focused developmental analysis of this passage.`,
      },
    ],
  });
  return textOf(msg);
}

export interface PatternInput {
  apiKey: string;
  notes: Note[];
}

/** Editorial pattern analysis across all notes: recurring themes, priorities. */
export async function analyzePatterns(
  input: PatternInput,
): Promise<string> {
  const summary = input.notes
    .map(
      (n) =>
        `- [${n.category}${n.resolved ? ", resolved" : ""}] ${n.text || "(voice note)"}`,
    )
    .join("\n");
  const msg = await client(input.apiKey).messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system:
      VOICE_GUARD +
      " Identify recurring themes across the author's revision notes " +
      "(e.g. frequent pacing concerns, character inconsistency). Produce a " +
      "short revision summary with priority recommendations. Markdown sections.",
    messages: [
      {
        role: "user",
        content: `Here are the author's revision notes:\n${summary}\n\nWhat patterns and priorities do you see?`,
      },
    ],
  });
  return textOf(msg);
}

export interface ContinuityInput {
  apiKey: string;
  passageText: string;
  bible: string;
}

/** Flags potential continuity issues between a passage and the story bible
 *  (character profiles and world rules). Does not rewrite. */
export async function continuityCheck(
  input: ContinuityInput,
): Promise<string> {
  const msg = await client(input.apiKey).messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system:
      VOICE_GUARD +
      " In this mode you check for CONTINUITY problems only. Compare the " +
      "passage against the story bible and flag contradictions in character " +
      "details, relationships, motivations, world rules, timelines, or " +
      "established facts. Do not rewrite. List each issue with the specific " +
      "conflicting detail and where it clashes with the bible. If you find no " +
      "issues, say so plainly. Use a short markdown list.",
    messages: [
      {
        role: "user",
        content:
          `Story bible:\n${input.bible}\n\n` +
          `Passage to check:\n"""\n${input.passageText}\n"""\n\n` +
          `Flag any continuity issues.`,
      },
    ],
  });
  return textOf(msg);
}

/** Friendly message for common API errors. */
export function describeAIError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Invalid API key. Check it in Settings.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API — try again in a moment.";
  }
  if (err instanceof Anthropic.APIError) {
    return `API error ${err.status ?? ""}: ${err.message}`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
