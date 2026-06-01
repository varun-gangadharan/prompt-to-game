# prompt-to-game

Type a prompt, get a playable browser game. Edit live params, save, share.

Three templates (v1): **platformer**, **top-down shooter**, **endless runner**.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Phaser 3 renderer behind a `GameRenderer` interface
- Anthropic Claude (Sonnet 4.6) for prompt → spec
- Postgres (Neon) via Drizzle, Clerk auth, Vercel Blob, Vercel hosting

## Status
Scaffold only. See [`PLAN.md`](./PLAN.md) and [`AGENTS.md`](./AGENTS.md) before writing code.

## Quick start
```bash
pnpm install
cp .env.example .env.local   # fill in secrets
pnpm dev
```

## Testing & eval
```bash
pnpm test     # vitest unit/integration (schema, renderers, API)
pnpm e2e      # Playwright prompt -> play flow (needs Clerk keys; see below)
pnpm eval     # 50-prompt generation eval -> scripts/eval/report.json
```

- **e2e** (`tests/e2e/prompt-to-play.spec.ts`) starts `pnpm dev` and drives the
  real `/` -> `/new` flow, stubbing `/api/generate` at the network boundary. It
  runs best with real Clerk keys configured; without them the app falls back to
  Clerk "keyless" mode, whose provisioning reloads make navigation flaky (the
  test retries to absorb this). Point it at an already-running server with
  `E2E_BASE_URL=http://localhost:3000 pnpm e2e`.
- **eval** POSTs each labelled prompt in `scripts/eval/prompts.json` to a running
  server's `/api/generate` (which needs `GEMINI_API_KEY`), validates against
  `gameSpecSchema`, and writes `schemaValidPct`, `templateAccuracyPct`,
  `p50/p95LatencyMs`, and `repairRate`. Exits non-zero unless schema-valid and
  template accuracy are both ≥90%. Override the target with `EVAL_BASE_URL`.

## Observability
`lib/observability/sentry.ts` wraps the API route handlers (`withSentry`). It is
a no-op until `SENTRY_DSN` is set, degrading to structured console logging.

## Repo map
See [`docs/architecture.md`](./docs/architecture.md).
