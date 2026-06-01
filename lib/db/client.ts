// Owner: A4. Singleton Drizzle client over postgres-js.
// DATABASE_URL comes from `vercel env pull` — Neon's connection string is
// already pooled, so no separate pooler/`-pooler` host is needed here.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

declare global {
  // Reuse the connection across HMR reloads / Fluid Compute instance reuse so
  // we don't exhaust the Neon connection pool with a client per module reload.
  // eslint-disable-next-line no-var
  var __ptgSql: ReturnType<typeof postgres> | undefined;
}

function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull` to populate it.",
    );
  }
  // prepare:false plays nicely with pooled (transaction-mode) connections.
  return postgres(url, { prepare: false });
}

const client = globalThis.__ptgSql ?? createSql();
if (process.env.NODE_ENV !== "production") {
  globalThis.__ptgSql = client;
}

export const db = drizzle(client, { schema });
export { schema };
