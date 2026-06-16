import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { importManuscriptFile } from "./import";
import { countSentences } from "./parse";

async function makeEpub(): Promise<File> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Lighthouse</dc:title></metadata>
      <manifest>
        <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine><itemref idref="c1"/><itemref idref="c2"/></spine>
    </package>`,
  );
  zip.file(
    "OEBPS/ch1.xhtml",
    `<html><body><h1>Chapter One</h1><p>He ran. She followed.</p><p>A second paragraph.</p></body></html>`,
  );
  zip.file(
    "OEBPS/ch2.xhtml",
    `<html><body><h2>Chapter Two</h2><p>Only one sentence here.</p></body></html>`,
  );
  const buf = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buf], "lighthouse.epub");
}

describe("importManuscriptFile (EPUB)", () => {
  it("imports a structured EPUB into chapters, paragraphs, and sentences", async () => {
    const m = await importManuscriptFile(await makeEpub());
    expect(m.source).toBe("epub");
    expect(m.title).toBe("Lighthouse");
    expect(m.chapters.map((c) => c.title)).toEqual([
      "Chapter One",
      "Chapter Two",
    ]);
    expect(m.chapters[0].paragraphs).toHaveLength(2);
    expect(countSentences(m)).toBe(4); // "He ran." "She followed." + 2 paras
  });

  it("imports plain text", async () => {
    const file = new File(["Chapter 1\n\nHello there. Bye now."], "x.txt");
    const m = await importManuscriptFile(file);
    expect(m.source).toBe("txt");
    expect(countSentences(m)).toBe(2);
  });

  it("rejects unsupported formats", async () => {
    await expect(
      importManuscriptFile(new File(["x"], "notes.rtf")),
    ).rejects.toThrow(/Unsupported/);
  });
});
