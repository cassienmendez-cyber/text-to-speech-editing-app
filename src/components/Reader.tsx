import { useEffect, useMemo, useRef } from "react";
import type { FlatSentence, Manuscript, Note } from "../types";
import type { Segment } from "../lib/mentions";

interface Props {
  manuscript: Manuscript;
  flat: FlatSentence[];
  currentIndex: number;
  notes: Note[];
  readerMode: boolean;
  onSeek: (index: number) => void;
  /** sentenceId → segments, for linking character/world names to profiles. */
  segments?: Map<string, Segment[]>;
  onEntityClick?: (entityId: string) => void;
  /** Reader font scale (1 = default). */
  fontScale?: number;
}

export default function Reader({
  manuscript,
  flat,
  currentIndex,
  notes,
  readerMode,
  onSeek,
  segments,
  onEntityClick,
  fontScale = 1,
}: Props) {
  const activeRef = useRef<HTMLSpanElement>(null);

  // Map each sentence id to its flattened playback index.
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    flat.forEach((f) => map.set(f.sentence.id, f.index));
    return map;
  }, [flat]);

  // Which sentences / paragraphs carry notes (for editorial indicators).
  const annotated = useMemo(() => {
    const sentences = new Set<string>();
    const paragraphs = new Set<string>();
    notes.forEach((n) => {
      if (n.anchor.sentenceId) sentences.add(n.anchor.sentenceId);
      if (n.anchor.paragraphId) paragraphs.add(n.anchor.paragraphId);
    });
    return { sentences, paragraphs };
  }, [notes]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentIndex]);

  return (
    <article
      className="prose-reader mx-auto max-w-2xl px-6 py-8 font-serif text-ink-100"
      style={{ fontSize: `${(1.05 * fontScale).toFixed(3)}rem`, lineHeight: 1.7 }}
    >
      {manuscript.chapters.map((chapter) => (
        <section key={chapter.id} className="mb-10">
          <h2 className="mb-5 font-sans text-xl font-semibold text-accent-400">
            {chapter.title}
          </h2>
          {chapter.paragraphs.map((paragraph) => (
            <div key={paragraph.id}>
              <p
                className={`mb-4 ${
                  !readerMode && annotated.paragraphs.has(paragraph.id)
                    ? "border-l-2 border-accent-500/40 pl-3"
                    : ""
                }`}
              >
                {paragraph.sentences.map((sentence) => {
                  const idx = indexById.get(sentence.id) ?? -1;
                  const active = idx === currentIndex;
                  const hasNote =
                    !readerMode && annotated.sentences.has(sentence.id);
                  const segs =
                    !readerMode && segments
                      ? segments.get(sentence.id)
                      : undefined;
                  return (
                    <span
                      key={sentence.id}
                      ref={active ? activeRef : undefined}
                      className={`sentence cursor-pointer px-0.5 ${
                        active ? "sentence-active" : ""
                      } ${hasNote ? "underline decoration-accent-500/60 decoration-dotted underline-offset-4" : ""}`}
                      onClick={() => onSeek(idx)}
                      title="Click to set the active location"
                    >
                      {segs
                        ? segs.map((s, i) =>
                            s.entityId ? (
                              <button
                                key={i}
                                className="rounded bg-accent-500/15 px-0.5 font-medium text-accent-300 hover:bg-accent-500/30"
                                title="Open in Story Bible"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEntityClick?.(s.entityId!);
                                }}
                              >
                                {s.text}
                              </button>
                            ) : (
                              <span key={i}>{s.text}</span>
                            ),
                          )
                        : sentence.text}{" "}
                    </span>
                  );
                })}
              </p>
              {paragraph.sceneBreakAfter && (
                <div className="my-6 text-center text-ink-500">⁂</div>
              )}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
