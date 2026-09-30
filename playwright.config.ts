import { defineConfig } from "@playwright/test";

const port = 4173,
  baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    // The Cloudflare adapter previews the built Worker, so build first. The
    // helper makes sure the QR gate secret exists before the build reads it.
    command: `node tests/prepare-dev-vars.mjs && pnpm exec astro build && pnpm exec astro preview --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
});
