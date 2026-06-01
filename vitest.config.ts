import { defineConfig } from "vitest/config";

// Unit/integration tests run under Vitest. The Playwright e2e suite lives in
// tests/e2e/*.spec.ts and is excluded here so `pnpm test` never tries to drive
// a browser — run those with `pnpm e2e` instead.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
  },
});
