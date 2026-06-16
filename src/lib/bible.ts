import type { Project } from "../types";

/** Compact a project's story bible (characters + world rules) into a string the
 *  AI assistant can reference. Returns "" when the bible is empty. */
export function buildBibleContext(project: {
  characters: Project["characters"];
  world: Project["world"];
}): string {
  const characters = project.characters
    .filter((c) => c.name.trim())
    .map((c) => {
      const details = [
        c.role && `role: ${c.role}`,
        c.physical && `physical: ${c.physical}`,
        c.personality && `personality: ${c.personality}`,
        c.relationships && `relationships: ${c.relationships}`,
        c.fears && `fears: ${c.fears}`,
        c.motivations && `motivations: ${c.motivations}`,
        c.background && `background: ${c.background}`,
      ]
        .filter(Boolean)
        .join("; ");
      return `- ${c.name}${details ? ` — ${details}` : ""}`;
    });

  const world = project.world
    .filter((w) => w.name.trim())
    .map((w) => {
      const body = [w.rules, w.notes].filter(Boolean).join(" ");
      return `- [${w.category}] ${w.name}${body ? `: ${body}` : ""}`;
    });

  return [
    characters.length ? `Characters:\n${characters.join("\n")}` : "",
    world.length ? `World rules:\n${world.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
