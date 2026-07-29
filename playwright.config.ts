import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: process.env.PROJECTD_E2E_RESULTS ?? "artifacts/e2e/results.json" }]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  expect: { timeout: 15_000 }
});
