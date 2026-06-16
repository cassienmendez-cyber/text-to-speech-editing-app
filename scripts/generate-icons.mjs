// Generates PWA/app icons from an inline SVG using sharp.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const publicDir = join(root, "public");
mkdirSync(iconsDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#12141c"/>
  <circle cx="256" cy="256" r="150" fill="#e8893a"/>
  <text x="256" y="322" font-family="Georgia, 'Times New Roman', serif"
        font-size="210" font-weight="600" text-anchor="middle"
        fill="#12141c">S</text>
</svg>`;
const buf = Buffer.from(svg);

const targets = [
  { file: join(iconsDir, "pwa-192x192.png"), size: 192 },
  { file: join(iconsDir, "pwa-512x512.png"), size: 512 },
  { file: join(iconsDir, "maskable-512x512.png"), size: 512 },
  { file: join(iconsDir, "apple-touch-icon.png"), size: 180 },
  { file: join(publicDir, "favicon-32x32.png"), size: 32 },
];

await Promise.all(
  targets.map(({ file, size }) =>
    sharp(buf).resize(size, size).png().toFile(file),
  ),
);

// A crisp vector favicon too.
import { writeFileSync } from "node:fs";
writeFileSync(join(publicDir, "favicon.svg"), svg);

console.log(`Generated ${targets.length} PNG icons + favicon.svg`);
