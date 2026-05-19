import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3104",
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3104",
    url: "http://127.0.0.1:3104",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
