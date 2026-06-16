// Drives the built app headlessly and captures desktop + mobile screenshots.
// Usage: node scripts/screenshot.mjs   (expects the preview server on :4173)
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const OUT = process.env.OUT_DIR || "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const clickByText = async (page, text) =>
  page.evaluate((t) => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes(t),
    );
    if (btn) btn.click();
  }, text);

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});

try {
  // ---- Desktop ----
  const desktop = await browser.newPage();
  desktop.on("console", (m) => console.log("[page]", m.type(), m.text()));
  desktop.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await desktop.setViewport({ width: 1366, height: 900, deviceScaleFactor: 2 });
  await desktop.goto(BASE, { waitUntil: "networkidle0" });

  await desktop.waitForFunction(() =>
    [...document.querySelectorAll("button")].some((b) =>
      b.textContent.includes("Load sample"),
    ),
  );
  await desktop.screenshot({ path: `${OUT}/01-library-desktop.png` });

  await clickByText(desktop, "Load sample");
  await new Promise((r) => setTimeout(r, 1500));
  await desktop.screenshot({ path: `${OUT}/02-after-click.png`, fullPage: true });
  const hasSentence = await desktop.$(".sentence");
  console.log("has .sentence after click:", !!hasSentence);
  await desktop.waitForSelector(".sentence", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));
  await desktop.screenshot({ path: `${OUT}/02-workspace-desktop.png` });

  // ---- Mobile (same browser context → project persists via localStorage) ----
  const mobile = await browser.newPage();
  await mobile.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(BASE, { waitUntil: "networkidle0" });
  await mobile.waitForSelector(".sentence", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));
  await mobile.screenshot({ path: `${OUT}/03-workspace-mobile.png` });

  // Open the editorial drawer on mobile.
  await mobile.click('button[title="Notes & tools"]');
  await new Promise((r) => setTimeout(r, 500));
  await mobile.screenshot({ path: `${OUT}/04-workspace-mobile-drawer.png` });

  console.log("Screenshots written to", OUT);
} finally {
  await browser.close();
}
