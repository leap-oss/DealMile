import { defineConfig } from "@playwright/test";
process.loadEnvFile(".env");
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60000,
  workers: 1,
  expect: { timeout: 15000 },
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    env: { APP_URL: baseURL },
    timeout: 120000,
  },
});
