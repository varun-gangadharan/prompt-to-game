import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// Dummy, well-formed Clerk keys let the app boot without a real auth instance.
// The pk_test value decodes to "example.clerk.accounts.dev$" so ClerkProvider
// accepts its format; the e2e flow never signs in, so no real auth call is made.
const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
const CLERK_SECRET_KEY =
  process.env.CLERK_SECRET_KEY ?? "sk_test_e2e-placeholder-secret-key-value";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // When E2E_BASE_URL points at an already-running server, skip the managed one.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: CLERK_PUBLISHABLE_KEY,
          CLERK_SECRET_KEY: CLERK_SECRET_KEY,
        },
      },
});
