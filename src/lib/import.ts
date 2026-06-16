import mammoth from "mammoth";
import { parseManuscript } from "./parse";
import type { Manuscript } from "../types";

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

  if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc files are not supported. Please save as .docx or .txt.",
    );
  }

  throw new Error(
    `Unsupported format: ${file.name}. Supported formats are DOCX and TXT.`,
  );
}
