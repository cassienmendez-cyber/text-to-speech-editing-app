// End-to-end smoke test. Drives the built app headlessly through the core
// flows and FAILS on any console error or uncaught page error — this is the
// guard that would have caught the React #185 infinite-render loop.
//
// Usage: start the preview server, then `node scripts/e2e.mjs`.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const OUT = "/tmp/e2e";
mkdirSync(OUT, { recursive: true });

// Console noise that is expected and not a real failure.
const IGNORE = [
  "Download the React DevTools",
  "speechSynthesis", // not available headless
];

const errors = [];
function watch(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORE.some((s) => m.text().includes(s))) {
      errors.push(`[${tag}] console.error: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => {
    if (!IGNORE.some((s) => e.message.includes(s))) {
      errors.push(`[${tag}] pageerror: ${e.message}`);
    }
  });
}

const steps = [];
async function step(name, fn) {
  process.stdout.write(`• ${name} … `);
  await fn();
  steps.push(name);
  console.log("ok");
}

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes(t),
    );
    if (!el) throw new Error(`button not found: ${t}`);
    el.click();
  }, text);

const waitText = (page, text, timeout = 8000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  // ---------------- Desktop flows ----------------
  const page = await browser.newPage();
  watch(page, "desktop");
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle0" });

  await step("library renders", () => waitText(page, "Load sample manuscript"));

  await step("open a project", async () => {
    await clickText(page, "Load sample");
    await page.waitForSelector(".sentence", { timeout: 8000 });
  });

  await step("switch every editorial tab", async () => {
    for (const tab of ["Bookmarks", "Dashboard", "AI", "Notes"]) {
      await clickText(page, tab);
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  await step("settings: toggle high-contrast theme", async () => {
    await page.click('button[title="Settings"]');
    await waitText(page, "Anthropic API key");
    // Flip the high-contrast checkbox and confirm the theme class applies.
    await page.evaluate(() => {
      const label = [...document.querySelectorAll("label")].find((l) =>
        l.textContent.includes("High-contrast"),
      );
      label.querySelector("input").click();
    });
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("hc"),
    );
    // Toggle back off and close.
    await page.evaluate(() => {
      const label = [...document.querySelectorAll("label")].find((l) =>
        l.textContent.includes("High-contrast"),
      );
      label.querySelector("input").click();
    });
    await clickText(page, "Done");
  });

  await step("toggle reader mode on and off", async () => {
    await page.click('button[aria-label="Toggle reading mode"]');
    await new Promise((r) => setTimeout(r, 200));
    await page.click('button[aria-label="Toggle reading mode"]');
    await new Promise((r) => setTimeout(r, 200));
  });

  await step("create a text note", async () => {
    await clickText(page, "Add note");
    await page.waitForSelector("textarea", { timeout: 5000 });
    await page.type("textarea", "Tighten this opening paragraph");
    await clickText(page, "Save note");
    await clickText(page, "Notes");
    await waitText(page, "Tighten this opening paragraph");
  });

  await step("note role chip + relocate", async () => {
    await clickText(page, "Notes");
    // The new note is tagged with an author role (default: Author).
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".chip")].some(
        (c) => c.textContent.trim() === "Author",
      ),
    );
    // Relocate it to the current playback location (non-destructive).
    await clickText(page, "Move here");
    await page.waitForFunction(() =>
      document.body.textContent.includes("Tighten this opening paragraph"),
    );
  });

  await step("add a character in the Story Bible", async () => {
    await page.click('button[title="Story Bible — characters & worldbuilding"]');
    await waitText(page, "Story Bible");
    await clickText(page, "Add character");
    await page.waitForSelector('input.field', { timeout: 5000 });
    await page.type("input.field", "Mara");
    await clickText(page, "Save");
    await waitText(page, "Mara");
    // Close the bible overlay.
    await page.click('button[title="Close"]');
    await page.waitForSelector(".sentence", { timeout: 5000 });
  });

  await step("manuscript ↔ bible linking round-trip", async () => {
    // "Mara" appears in the sample manuscript and is now a clickable link.
    await page.waitForFunction(() =>
      [...document.querySelectorAll("article button")].some(
        (b) => b.textContent.trim() === "Mara",
      ),
    );
    await page.evaluate(() => {
      const link = [...document.querySelectorAll("article button")].find(
        (b) => b.textContent.trim() === "Mara",
      );
      link.click();
    });
    // The character's profile opens, showing where it's mentioned.
    // Use textContent (not innerText) so the CSS uppercase heading still matches.
    await page.waitForFunction(
      () =>
        document.body.textContent.includes("Mentions in the manuscript"),
      { timeout: 8000 },
    );
    await page.click('button[title="Close"]');
    await page.waitForSelector(".sentence", { timeout: 5000 });
  });

  await step("jump between chapters via the chapter menu", async () => {
    await page.click('button[title="Jump to a chapter"]');
    await waitText(page, "Chapters");
    // Jump to the last chapter entry in the list.
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("button")].filter((b) =>
        /^\s*\d+\s/.test(b.innerText),
      );
      items[items.length - 1].click();
    });
    await page.waitForSelector(".sentence", { timeout: 5000 });
  });

  await step("enter and exit Drive Mode", async () => {
    await page.click('button[title="Hands-free review for the car"]');
    await waitText(page, "Drive Mode");
    await clickText(page, "End drive");
    await waitText(page, "Drive session");
    await clickText(page, "Done");
    await page.waitForSelector(".sentence", { timeout: 5000 });
  });

  // ---------------- Mobile flows ----------------
  const mobile = await browser.newPage();
  watch(mobile, "mobile");
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobile.goto(BASE, { waitUntil: "networkidle0" });

  await step("mobile project renders", () =>
    mobile.waitForSelector(".sentence", { timeout: 8000 }),
  );

  await step("mobile drawer opens and switches tab", async () => {
    await mobile.click('button[title="Notes & tools"]');
    await waitText(mobile, "Notes & tools");
    await clickText(mobile, "Dashboard");
    await new Promise((r) => setTimeout(r, 250));
  });
} catch (err) {
  errors.push(`flow failure: ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\nCompleted ${steps.length} steps.`);
if (errors.length) {
  console.error(`\n✗ e2e FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("✓ e2e passed — no console/page errors across all flows.");
