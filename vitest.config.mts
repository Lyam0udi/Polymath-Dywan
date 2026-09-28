import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit / integration tests only.
 * Playwright e2e lives under tests/e2e and runs via `npm run test:e2e`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/tests/e2e/**",
      "**/e2e/**",
    ],
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
