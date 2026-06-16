import { useMemo, useState } from "react";
import { useStore } from "../store";
import { countSentences } from "../lib/parse";

interface Props {
  projectId: string;
}

export default function Dashboard({ projectId }: Props) {
  const project = useStore((s) => s.projects[projectId]);
  const addPass = useStore((s) => s.addPass);
  const deletePass = useStore((s) => s.deletePass);
  const [newPass, setNewPass] = useState("");

  const stats = useMemo(() => {
    if (!project) return null;
    const notes = project.notes;
    const resolved = notes.filter((n) => n.resolved).length;
    const byCategory = new Map<string, number>();
    const byTag = new Map<string, number>();
    const byPass = new Map<string, number>();
    notes.forEach((n) => {
      byCategory.set(n.category, (byCategory.get(n.category) ?? 0) + 1);
      n.tags.forEach((t) => byTag.set(t, (byTag.get(t) ?? 0) + 1));
      n.passIds.forEach((id) => byPass.set(id, (byPass.get(id) ?? 0) + 1));
    });
    return {
      chapters: project.manuscript.chapters.length,
      sentences: countSentences(project.manuscript),
      total: notes.length,
      resolved,
      unresolved: notes.length - resolved,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      byTag: [...byTag.entries()].sort((a, b) => b[1] - a[1]),
      byPass,
    };
  }, [project]);

  if (!project || !stats) return null;

  const max = Math.max(1, ...stats.byCategory.map(([, c]) => c));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Chapters" value={stats.chapters} />
        <Stat label="Total notes" value={stats.total} />
        <Stat label="Unresolved" value={stats.unresolved} accent />
        <Stat label="Resolved" value={stats.resolved} />
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Category distribution
        </h4>
        {stats.byCategory.length === 0 ? (
          <p className="text-xs text-ink-500">No notes yet.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.byCategory.map(([cat, count]) => (
              <div key={cat} className="text-xs">
                <div className="mb-0.5 flex justify-between text-ink-300">
                  <span>{cat}</span>
                  <span>{count}</span>
                </div>
                <div className="h-1.5 w-full rounded bg-ink-800">
                  <div
                    className="h-1.5 rounded bg-accent-500"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {stats.byTag.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Emotional reaction trends
          </h4>
          <div className="flex flex-wrap gap-1">
            {stats.byTag.map(([tag, count]) => (
              <span key={tag} className="chip">
                {tag} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Revision passes
        </h4>
        <div className="space-y-1.5">
          {project.passes.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-1.5 text-sm"
            >
              <span>{p.name}</span>
              <span className="flex items-center gap-2 text-xs text-ink-400">
                {stats.byPass.get(p.id) ?? 0} notes
                <button
                  className="text-red-400 hover:underline"
                  onClick={() => deletePass(projectId, p.id)}
                >
                  remove
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="field py-1"
            placeholder="New pass (e.g. Tension Pass)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPass.trim()) {
                addPass(projectId, newPass.trim());
                setNewPass("");
              }
            }}
          />
          <button
            className="btn-ghost py-1"
            onClick={() => {
              if (newPass.trim()) {
                addPass(projectId, newPass.trim());
                setNewPass("");
              }
            }}
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="card py-3 text-center">
      <div
        className={`text-2xl font-semibold ${accent ? "text-accent-500" : "text-ink-50"}`}
      >
        {value}
      </div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
