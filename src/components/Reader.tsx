import { useEffect, useMemo, useRef } from "react";
import type { FlatSentence, Manuscript, Note } from "../types";

interface Props {
  manuscript: Manuscript;
  flat: FlatSentence[];
  currentIndex: number;
  notes: Note[];
  readerMode: boolean;
  onSeek: (index: number) => void;
}

export default function Reader({
  manuscript,
  flat,
  currentIndex,
  notes,
  readerMode,
  onSeek,
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
    <article className="prose-reader mx-auto max-w-2xl px-6 py-8 font-serif text-[1.05rem] leading-8 text-ink-100">
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
                      {sentence.text}{" "}
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
