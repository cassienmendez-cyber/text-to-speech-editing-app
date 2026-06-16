// Pure EPUB parsing helpers (no DOM / no zip), kept separate so they're unit
// testable in Node. The actual unzip happens in import.ts via JSZip.

export interface EpubSection {
  title: string;
  paragraphs: string[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    // Tags become spaces, which can orphan punctuation ("line ." → "line.").
    .replace(/\s+([.,;:!?’”")])/g, "$1")
    .trim();
}

/** Resolve a spine href relative to the OPF's directory. */
export function resolvePath(opfDir: string, href: string): string {
  const clean = href.replace(/[#?].*$/, ""); // drop fragments/queries
  if (clean.startsWith("/")) return clean.slice(1);
  const out: string[] = [];
  for (const part of (opfDir + clean).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** The OPF package document path, read from META-INF/container.xml. */
export function opfPathFromContainer(containerXml: string): string {
  const m = containerXml.match(/full-path\s*=\s*"([^"]+)"/i);
  return m ? m[1] : "";
}

/** Spine reading order (as hrefs) and the book title, from the OPF. */
export function parseOpf(opfXml: string): {
  title: string;
  spineHrefs: string[];
} {
  const manifest = new Map<string, string>();
  for (const m of opfXml.matchAll(/<item\b([^>]*)>/gi)) {
    const attrs = m[1];
    const id = attrs.match(/\bid\s*=\s*"([^"]+)"/i)?.[1];
    const href = attrs.match(/\bhref\s*=\s*"([^"]+)"/i)?.[1];
    if (id && href) manifest.set(id, href);
  }
  const spineHrefs: string[] = [];
  for (const m of opfXml.matchAll(/<itemref\b([^>]*)>/gi)) {
    const idref = m[1].match(/\bidref\s*=\s*"([^"]+)"/i)?.[1];
    const href = idref && manifest.get(idref);
    if (href) spineHrefs.push(href);
  }
  const t = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  return {
    title: t ? stripTags(t[1]) : "",
    spineHrefs,
  };
}

/** Turn one XHTML spine document into a section (title + paragraphs). */
export function xhtmlToSection(html: string, fallbackTitle: string): EpubSection {
  let body = html;
  const bodyMatch = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  body = body.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");

  const heading = body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const title = heading ? stripTags(heading[1]) : fallbackTitle;

  let paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);

  // Fallback for documents without <p> tags: split on breaks. Preserve the
  // newlines (stripTags would collapse them), then split.
  if (paragraphs.length === 0) {
    const text = decodeEntities(
      body
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ).replace(/[ \t]+/g, " ");
    paragraphs = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return { title, paragraphs };
}
