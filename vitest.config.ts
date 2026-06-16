import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the PWA plugin doesn't run under tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
