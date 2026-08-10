import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    // scripts/*.test.mjs are node:test suites (db-verify CLI tests) run via
    // `npm run test:verify` — not vitest pool tests.
    exclude: ["scripts/**", "node_modules/**", "dist/**", "**/node_modules/**"],
  },
});