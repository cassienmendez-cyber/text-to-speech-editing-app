// Real two-peer collaboration test: two isolated browser contexts connect over
// WebRTC (via a local signaling server) and sync a project + notes live.
// Requires the app built with VITE_SIGNALING=ws://localhost:4444 and preview
// running, plus the y-webrtc signaling server on :4444.
import puppeteer from "puppeteer";

const BASE = "http://localhost:4173";
const clickText = (p, t) =>
  p.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.includes(t),
    );
    if (!b) throw new Error("no button: " + t);
    b.click();
  }, t);
const waitText = (p, t, timeout = 20000) =>
  p.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, t);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    // Allow loopback host ICE candidates so two local peers can connect
    // without a STUN server.
    "--disable-features=WebRtcHideLocalIpsWithMdns",
    "--force-webrtc-ip-handling-policy=default",
  ],
});

const fail = (m) => {
  console.error("✗ " + m);
  process.exitCode = 1;
};

try {
  // ---- Peer A (host) ----
  const ctxA = await browser.createBrowserContext();
  const a = await ctxA.newPage();
  a.on("pageerror", (e) => fail("A pageerror: " + e.message));
  await a.goto(BASE, { waitUntil: "networkidle0" });
  await waitText(a, "Load sample");
  await clickText(a, "Load sample");
  await a.waitForSelector(".sentence");
  await clickText(a, "Collaborate");
  await waitText(a, "Live collaboration");
  await clickText(a, "Start sharing this project");
  await a.waitForFunction(() => document.querySelector("code")?.textContent?.length === 6, { timeout: 15000 });
  const code = await a.$eval("code", (el) => el.textContent.trim());
  console.log("• host sharing, room code:", code);
  // Close the modal.
  await a.keyboard.press("Escape").catch(() => {});
  await a.evaluate(() => {
    const x = [...document.querySelectorAll("button")].find((b) =>
      b.querySelector("svg") && b.title === "",
    );
  });

  // ---- Peer B (joiner, isolated storage) ----
  const ctxB = await browser.createBrowserContext();
  const b = await ctxB.newPage();
  b.on("pageerror", (e) => fail("B pageerror: " + e.message));
  await b.goto(BASE, { waitUntil: "networkidle0" });
  await waitText(b, "Join session");
  await clickText(b, "Join session");
  await waitText(b, "Live collaboration");
  await b.type('input[placeholder="ROOM CODE"]', code);
  await clickText(b, "Join");

  // The project should arrive over WebRTC and render in B.
  await b.waitForSelector(".sentence", { timeout: 25000 });
  console.log("• joiner received the project (manuscript synced)");
  await waitText(b, "The lighthouse had been dark", 10000);

  // ---- Host adds a note → should appear on joiner ----
  await clickText(a, "Add note");
  await a.waitForSelector("textarea");
  await a.type("textarea", "AUTHOR_NOTE_SYNC_CHECK");
  await clickText(a, "Save note");
  await b.waitForFunction(
    () => document.body.innerText.includes("AUTHOR_NOTE_SYNC_CHECK"),
    { timeout: 20000 },
  );
  console.log("• host's note synced to joiner");

  // ---- Joiner adds a note → should appear on host ----
  // Ensure the Notes tab is visible on B, then add via its playback bar.
  await clickText(b, "Add note");
  await b.waitForSelector("textarea");
  await b.type("textarea", "BETA_NOTE_SYNC_CHECK");
  await clickText(b, "Save note");
  await a.waitForFunction(
    () => document.body.innerText.includes("BETA_NOTE_SYNC_CHECK"),
    { timeout: 20000 },
  );
  console.log("• joiner's note synced back to host");

  console.log("\n✓ real-time two-peer sync works (manuscript + notes, both directions)");
} catch (e) {
  fail("flow: " + e.message);
} finally {
  await browser.close();
}
