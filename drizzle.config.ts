import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

// drizzle-kit does not auto-load .env.local (the file `vercel env pull` writes
// to). Load it here so `pnpm db:migrate` sees DATABASE_URL without extra flags.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local — rely on the ambient environment (CI, vercel, etc.).
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
