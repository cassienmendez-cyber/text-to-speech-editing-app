import mammoth from "mammoth";
import { manuscriptFromSections, parseManuscript } from "./parse";
import {
  opfPathFromContainer,
  parseOpf,
  resolvePath,
  xhtmlToSection,
} from "./epub";
import { pagesToText, type PdfItem } from "./pdf";
import type { Manuscript } from "../types";

async function importPdf(file: File): Promise<Manuscript> {
  // pdfjs (and its worker) are dynamically imported so they stay out of the
  // main bundle — only loaded when a PDF is actually imported.
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default as string;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: PdfItem[][] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: PdfItem[] = content.items
      .filter((it): it is typeof it & { str: string; transform: number[] } =>
        "str" in it,
      )
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    pages.push(items);
  }
  const title = stripExtension(file.name);
  return parseManuscript(pagesToText(pages), title, "pdf");
}

async function importEpub(file: File): Promise<Manuscript> {
  // JSZip is dynamically imported so it stays out of the main bundle.
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const containerXml = await zip
    .file("META-INF/container.xml")
    ?.async("string");
  const opfPath = containerXml ? opfPathFromContainer(containerXml) : "";
  const opfXml = opfPath ? await zip.file(opfPath)?.async("string") : undefined;
  if (!opfXml) throw new Error("This EPUB is missing its package document.");

  const { title, spineHrefs } = parseOpf(opfXml);
  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  const sections = [];
  for (const href of spineHrefs) {
    const path = resolvePath(opfDir, href);
    const entry = zip.file(path) ?? zip.file(decodeURIComponent(path));
    if (!entry) continue;
    const html = await entry.async("string");
    sections.push(xhtmlToSection(html, ""));
  }

  return manuscriptFromSections(
    title || stripExtension(file.name),
    sections,
    "epub",
  );
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/**
 * Import a manuscript file. Supports TXT and DOCX for the MVP; EPUB and PDF are
 * planned. Everything runs locally in the browser — no upload occurs.
 */
export async function importManuscriptFile(file: File): Promise<Manuscript> {
  const name = file.name.toLowerCase();
  const title = stripExtension(file.name);

  if (name.endsWith(".txt")) {
    const text = await file.text();
    return parseManuscript(text, title, "txt");
  }

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    // mammoth preserves paragraph breaks as double newlines in raw text.
    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseManuscript(result.value, title, "docx");
  }

  if (name.endsWith(".epub")) {
    return importEpub(file);
  }

  if (name.endsWith(".pdf")) {
    return importPdf(file);
  }

  if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc files are not supported. Please save as .docx or .txt.",
    );
  }

  throw new Error(
    `Unsupported format: ${file.name}. Supported formats are DOCX, EPUB, PDF, and TXT.`,
  );
}
