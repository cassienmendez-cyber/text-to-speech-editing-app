import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Available at config time under Node; declared locally to avoid @types/node.
declare const process: { env: Record<string, string | undefined> };

// On GitHub Pages the app is served from /<repo>/, so the deploy workflow sets
// BASE_PATH=/text-to-speech-editing-app/. Locally it defaults to "/".
const base = process.env.BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon-32x32.png",
        "icons/apple-touch-icon.png",
      ],
      manifest: {
        name: "StoryScribe",
        short_name: "StoryScribe",
        description:
          "An audio-first revision companion for authors. Listen, capture revision ideas by voice, and revise on the go.",
        theme_color: "#12141c",
        background_color: "#12141c",
        display: "standalone",
        orientation: "portrait",
        // Base-relative so installs work under the GitHub Pages subpath.
        start_url: base,
        scope: base,
        icons: [
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // The eSpeak engine + voice data (~1.7 MB) shouldn't bloat everyone's
        // install — cache it at runtime only if the author uses it.
        globIgnores: ["**/espeak-*.js"],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/espeak-.*\.js$/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /espeak-.*\.js$/,
            handler: "CacheFirst",
            options: { cacheName: "espeak-voices" },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Keep the eSpeak engine + voices in one named, on-demand chunk.
        manualChunks(id: string) {
          if (id.includes("node_modules/mespeak")) return "espeak";
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
