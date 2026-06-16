import { describe, it, expect } from "vitest";
import {
  decodeEntities,
  stripTags,
  resolvePath,
  opfPathFromContainer,
  parseOpf,
  xhtmlToSection,
} from "./epub";

describe("epub helpers", () => {
  it("decodes entities and strips tags", () => {
    expect(decodeEntities("Mara &amp; the &#39;Light&#39;")).toBe(
      "Mara & the 'Light'",
    );
    expect(stripTags("<p>Hello <em>there</em></p>")).toBe("Hello there");
  });

  it("resolves spine hrefs relative to the OPF dir", () => {
    expect(resolvePath("OEBPS/", "text/ch1.xhtml")).toBe("OEBPS/text/ch1.xhtml");
    expect(resolvePath("OEBPS/text/", "../ch1.xhtml#frag")).toBe(
      "OEBPS/ch1.xhtml",
    );
    expect(resolvePath("OEBPS/", "/abs/ch1.xhtml")).toBe("abs/ch1.xhtml");
  });

  it("reads the OPF path from container.xml", () => {
    const xml = `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
    expect(opfPathFromContainer(xml)).toBe("OEBPS/content.opf");
  });

  it("parses title and spine order from the OPF", () => {
    const opf = `<?xml version="1.0"?>
      <package><metadata><dc:title>The Keeper's Log</dc:title></metadata>
      <manifest>
        <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
        <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="css" href="style.css" media-type="text/css"/>
      </manifest>
      <spine>
        <itemref idref="c1"/>
        <itemref idref="c2"/>
      </spine></package>`;
    const { title, spineHrefs } = parseOpf(opf);
    expect(title).toBe("The Keeper's Log");
    expect(spineHrefs).toEqual(["ch1.xhtml", "ch2.xhtml"]);
  });

  it("extracts a section title and paragraphs from XHTML", () => {
    const html = `<html><head><title>x</title><style>p{}</style></head>
      <body><h1>Chapter One</h1><p>First line.</p><p>Second <b>line</b>.</p></body></html>`;
    const sec = xhtmlToSection(html, "fallback");
    expect(sec.title).toBe("Chapter One");
    expect(sec.paragraphs).toEqual(["First line.", "Second line."]);
  });

  it("falls back to break-splitting when there are no <p> tags", () => {
    const html = `<body>Line one.<br/><br/>Line two.</body>`;
    const sec = xhtmlToSection(html, "Untitled");
    expect(sec.title).toBe("Untitled");
    expect(sec.paragraphs).toEqual(["Line one.", "Line two."]);
  });
});
