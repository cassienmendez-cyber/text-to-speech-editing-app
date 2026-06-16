import { useState } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store";
import { buildBibleContext } from "../lib/bible";
import type { FlatSentence, Revision } from "../types";
import { Sparkles, Check, Settings as SettingsIcon } from "./icons";

// The AI module (and the Anthropic SDK it pulls in) is loaded on demand, so it
// stays out of the main bundle until the author actually runs an AI action.
type AIModule = typeof import("../lib/ai");

interface Props {
  projectId: string;
  current?: FlatSentence;
  onOpenSettings: () => void;
}

export default function AIPanel({ projectId, current, onOpenSettings }: Props) {
  const project = useStore((s) => s.projects[projectId]);
  const settings = useStore((s) => s.settings);
  const addRevision = useStore((s) => s.addRevision);
  const replaceParagraphText = useStore((s) => s.replaceParagraphText);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A pending rewrite suggestion awaiting the author's approval.
  const [draft, setDraft] = useState<string | null>(null);
  // A read-only analysis result.
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [batchScope, setBatchScope] = useState("__chapter__");

  if (!project) return null;

  const aiEnabled = settings.aiMode !== "off";
  const hasKey = settings.apiKey.trim().length > 0;

  const paragraph = current?.paragraph;
  const passageText = paragraph
    ? paragraph.sentences.map((s) => s.text).join(" ")
    : "";
  const passageNotes = paragraph
    ? project.notes.filter((n) => n.anchor.paragraphId === paragraph.id)
    : [];
  const bible = buildBibleContext(project);
  const unresolved = project.notes.filter((n) => !n.resolved);
  const unresolvedCategories = [...new Set(unresolved.map((n) => n.category))];

  async function run(action: (ai: AIModule) => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      const ai = await import("../lib/ai");
      try {
        await action(ai);
      } catch (err) {
        setError(ai.describeAIError(err));
      }
    } catch {
      setError("Could not load the AI module. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function doSuggest() {
    setAnalysis(null);
    setDraft(null);
    run(async (ai) => {
      const text = await ai.suggestRewrite({
        apiKey: settings.apiKey,
        passageText,
        notes: passageNotes,
        context: passageText,
      });
      setDraft(text);
    });
  }

  function doAnalyze() {
    setDraft(null);
    setAnalysis(null);
    run(async (ai) => {
      const text = await ai.analyzePassage({
        apiKey: settings.apiKey,
        title: current?.chapter.title ?? "Passage",
        passageText,
        notes: passageNotes,
        bible,
      });
      setAnalysis(text);
    });
  }

  function doContinuity() {
    setDraft(null);
    setAnalysis(null);
    run(async (ai) => {
      const text = await ai.continuityCheck({
        apiKey: settings.apiKey,
        passageText,
        bible,
      });
      setAnalysis(text);
    });
  }

  function doBatch() {
    setDraft(null);
    setAnalysis(null);
    const unresolved = project.notes.filter((n) => !n.resolved);
    const inScope =
      batchScope === "__chapter__"
        ? unresolved.filter((n) => n.anchor.chapterId === current?.chapter.id)
        : unresolved.filter((n) => n.category === batchScope);
    if (inScope.length === 0) {
      setError("No unresolved notes in that scope.");
      return;
    }
    const scopeLabel =
      batchScope === "__chapter__"
        ? `Chapter: ${current?.chapter.title ?? ""}`
        : `All unresolved ${batchScope} notes`;
    run(async (ai) => {
      const text = await ai.analyzeBatch({
        apiKey: settings.apiKey,
        scopeLabel,
        items: inScope.map((n) => ({
          category: n.category,
          noteText: n.text,
          context: n.contextText,
        })),
        bible,
      });
      setAnalysis(text);
    });
  }

  function doPatterns() {
    setDraft(null);
    setAnalysis(null);
    run(async (ai) => {
      const text = await ai.analyzePatterns({
        apiKey: settings.apiKey,
        notes: project.notes,
      });
      setAnalysis(text);
    });
  }

  function acceptDraft() {
    if (!draft || !current || !paragraph) return;
    const revision: Revision = {
      id: nanoid(10),
      originalText: passageText,
      revisedText: draft,
      dateAccepted: Date.now(),
      source: settings.aiMode === "collaborate" ? "ai-collaborate" : "ai-suggest",
      chapterId: current.chapter.id,
      paragraphId: paragraph.id,
      applied: true,
    };
    replaceParagraphText(projectId, current.chapter.id, paragraph.id, draft);
    addRevision(projectId, revision);
    setDraft(null);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-sm">
      {!aiEnabled || !hasKey ? (
        <div className="card space-y-2 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-accent-500" />
          <p className="text-ink-200">The AI editorial assistant is optional.</p>
          <p className="text-xs text-ink-400">
            {aiEnabled
              ? "Add your Anthropic API key to enable suggestions and analysis."
              : "Turn it on (Suggest / Analyze / Collaborate) to get editorial help. AI never changes your text without your approval."}
          </p>
          <button className="btn-ghost mx-auto" onClick={onOpenSettings}>
            <SettingsIcon className="h-4 w-4" /> Open settings
          </button>
        </div>
      ) : (
        <>
          <div className="text-xs text-ink-400">
            Mode: <span className="text-accent-400 capitalize">{settings.aiMode}</span>{" "}
            · acting on{" "}
            <span className="text-ink-200">
              {current ? current.chapter.title : "—"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={doSuggest}
              disabled={busy || !paragraph}
            >
              <Sparkles className="h-4 w-4" /> Suggest rewrite
            </button>
            <button
              className="btn-ghost"
              onClick={doAnalyze}
              disabled={busy || !paragraph}
            >
              Analyze passage
            </button>
            <button className="btn-ghost" onClick={doPatterns} disabled={busy}>
              Note patterns
            </button>
            {bible && (
              <button
                className="btn-ghost"
                onClick={doContinuity}
                disabled={busy || !paragraph}
                title="Check this passage against your story bible"
              >
                Continuity check
              </button>
            )}
          </div>

          {!bible && (
            <p className="text-xs text-ink-500">
              Tip: build your Story Bible (characters &amp; worldbuilding) so the
              assistant can reference profiles and flag continuity issues.
            </p>
          )}

          {passageNotes.length > 0 && (
            <p className="text-xs text-ink-500">
              {passageNotes.length} note
              {passageNotes.length === 1 ? "" : "s"} on this paragraph will be
              included.
            </p>
          )}

          {unresolved.length > 0 && (
            <div className="rounded-lg border border-ink-800 p-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Batch revision assistance
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="field w-auto flex-1 py-1"
                  value={batchScope}
                  onChange={(e) => setBatchScope(e.target.value)}
                >
                  <option value="__chapter__">This chapter</option>
                  {unresolvedCategories.map((c) => (
                    <option key={c} value={c}>
                      All {c} notes
                    </option>
                  ))}
                </select>
                <button
                  className="btn-ghost py-1"
                  onClick={doBatch}
                  disabled={busy}
                >
                  Generate
                </button>
              </div>
            </div>
          )}

          {busy && (
            <p className="animate-pulse text-xs text-accent-400">Thinking…</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {draft !== null && (
            <div className="card space-y-2 border-accent-500/40">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent-400">
                Suggested rewrite — your approval required
              </div>
              <textarea
                className="field min-h-[140px] font-serif"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button className="btn-ghost py-1" onClick={() => setDraft(null)}>
                  Reject
                </button>
                <button className="btn-primary py-1" onClick={acceptDraft}>
                  <Check className="h-4 w-4" /> Accept &amp; apply
                </button>
              </div>
              <p className="text-[10px] text-ink-500">
                Accepting replaces the paragraph and records the change in
                Revision history (restorable).
              </p>
            </div>
          )}

          {analysis !== null && (
            <div className="card space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Editorial analysis
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-ink-200">
                {analysis}
              </pre>
            </div>
          )}

          {project.revisions.length > 0 && (
            <RevisionHistory projectId={projectId} />
          )}
        </>
      )}
    </div>
  );
}

function RevisionHistory({ projectId }: { projectId: string }) {
  const project = useStore((s) => s.projects[projectId]);
  const replaceParagraphText = useStore((s) => s.replaceParagraphText);
  const setRevisionApplied = useStore((s) => s.setRevisionApplied);
  if (!project) return null;

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        Revision history
      </h4>
      {project.revisions.map((r) => (
        <div key={r.id} className="card space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="chip">{r.source}</span>
            <span className="text-ink-500">
              {new Date(r.dateAccepted).toLocaleString()}
            </span>
          </div>
          <p className="text-ink-500 line-clamp-2">
            <span className="text-ink-400">was:</span> {r.originalText}
          </p>
          <button
            className="text-accent-400 hover:underline"
            onClick={() => {
              const target = r.applied ? r.originalText : r.revisedText;
              replaceParagraphText(projectId, r.chapterId, r.paragraphId, target);
              setRevisionApplied(projectId, r.id, !r.applied);
            }}
          >
            {r.applied ? "Restore original" : "Re-apply revision"}
          </button>
        </div>
      ))}
    </section>
  );
}
