# Production-Readiness Audit — Phase 1

- **Repo:** prompt-to-game
- **Branch / HEAD:** `main` @ `2bd1e40` (feat: land M0 schema/api stubs, M1 platformer renderer, editor shell)
- **Date:** 2026-06-01
- **Auditor:** Production-Readiness Auditor (read-only)
- **Working-tree state:** M2 work uncommitted at audit time — Gemini LLM path (`lib/llm/*`), shooter/runner renderers (`lib/renderer/{shooter,runner}/*`), and their tests are untracked; `app/api/generate/route.ts`, `components/renderer/GameCanvas.tsx`, `package.json`, `pnpm-lock.yaml` modified. This audit covers the working tree (what will be committed), not just `HEAD`.

> **Milestone context:** Per `AGENTS.md`, only M0 (A3 spec/API), M1 (A2 platformer renderer + shell), and M2-in-progress (A3 Gemini path, A5 shooter/runner) have landed. **A4 (db / auth / games / og / share) and A6 (eval harness / e2e / Sentry) are not implemented** — those directories contain only `.gitkeep`. Findings that depend on A4/A6 are recorded as **Info** (correctly not-yet-built), not defects, except where a missing guardrail (rate limit, CSP, middleware) should exist before those routes land.

---

## Summary — counts by severity

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 5 |
| Medium | 5 |
| Low | 3 |
| Info | 7 |

No active vulnerability (no leaked secret, no exposed admin route). `.env.local` is present on disk but **untracked** (confirmed via `git ls-files`), and `.gitignore` covers `.env*`.

---

## Top 5 fixes (severity-ordered)

### 1. [High] CI is fully red on `main` — pnpm version declared twice
`.github/workflows/ci.yml:11` pins `pnpm/action-setup@v4` to `version: 9` **and** `package.json:38` sets `"packageManager": "pnpm@9.0.0"`. `action-setup@v4` treats this as a conflict and aborts in ~8s with `ERR_PNPM_BAD_PM_VERSION`, **before** `typecheck`/`lint`/`test` ever run. Both of the last two runs on `main` failed for this reason (`gh run list`). The repo's stated merge gate ("merge to main only when contract tests pass," `AGENTS.md`) is therefore non-functional — regressions can land undetected. Fix: remove `with: { version: 9 }` from the workflow and let `packageManager` drive the version (or drop `packageManager` and keep the pin). This is the single highest-leverage fix.

### 2. [High] `pnpm lint` is unconfigured — second CI failure waiting behind #1
There is no `.eslintrc*` / `eslint.config.*`. `next lint` drops into an **interactive** "How would you like to configure ESLint?" prompt and exits non-zero in CI (no TTY). Even after fix #1, the `pnpm lint` step will fail. Fix: add a committed ESLint config (`next/core-web-vitals`) or replace the lint step. Until then the "lint green" contract cannot be met.

### 3. [High] Env-var drift: code requires `GEMINI_API_KEY`, `.env.example` ships `ANTHROPIC_API_KEY`
`lib/llm/client.ts:6` reads `process.env.GEMINI_API_KEY` (throws if missing) and `lib/llm/generateSpec.ts:14` reads `GEMINI_MODEL`, but `.env.example` declares `ANTHROPIC_API_KEY` and `CLERK_SECRET_KEY` and **never mentions `GEMINI_API_KEY`/`GEMINI_MODEL`**. A fresh clone following `.env.example` cannot run `/api/generate` — it 500s with "Missing GEMINI_API_KEY". `@anthropic-ai/sdk` is also still a dependency but imported nowhere (dead dep). Fix: update `.env.example` to `GEMINI_API_KEY=` / optional `GEMINI_MODEL=`, drop `@anthropic-ai/sdk`, and reconcile the README/docs which reference the LLM provider.

### 4. [High] No rate limit on `POST /api/generate`
`docs/api.md` specifies a `429 rate-limit` response, but `app/api/generate/route.ts` has no rate limiting, no abuse filter, and no auth — every request hits the paid Gemini model (up to ~4 model calls per request, see Medium #8). This is an unbounded-cost / abuse vector the moment it is public. Fix: add an IP/user rate limiter (e.g. Upstash Redis or Vercel firewall rule) returning `429`, normalizing path casing/trailing slash so it can't be bypassed.

### 5. [High] No security headers / CSP
`next.config.mjs` sets no `headers()` — no Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, or `frame-ancestors`. Phaser injects a `<canvas>` and the renderer is the place where a future XSS would land; shipping the public play page (A4) without a baseline CSP is a gap. Fix: add a `headers()` block with a baseline CSP (allowing only the embed origins intended for `/g/[slug]`), `nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

---

## Full findings by category

### 1. Security
| # | Severity | File:line | Finding | Why it matters | Fix |
|---|---|---|---|---|---|
| S1 | High | `app/api/generate/route.ts` (whole) | No rate limit / abuse filter / auth on generate | Unbounded LLM cost + abuse; `api.md` promises `429` | See Top-fix #4 |
| S2 | High | `next.config.mjs:1-9` | No CSP / security headers | XSS / clickjacking surface for public play page | See Top-fix #5 |
| S3 | Medium | `lib/llm/generateSpec.ts` / route | No prompt abuse filter before model call | Spec'd guardrail missing; only length is checked | Add keyword/category filter pre-call |
| S4 | Medium | (absent) `middleware.ts` | No Clerk middleware exists | When A4 lands `/me` + `/api/games*` will be ungated by default; matcher must be added with those routes | Add `middleware.ts` with matcher when A4 lands; track now |
| S5 | Low | working tree | `tsconfig.tsbuildinfo` and `.claude/` are untracked **and not gitignored** | Risk of committing build artifacts / local state | Add both to `.gitignore` |
| S6 ✓ | — | `.env.local` | Untracked; `.gitignore` covers `.env*`, `.vercel`, `node_modules`, `.next` | clean | — |
| S7 ✓ | — | repo-wide grep | No secrets in `*.ts/*.tsx/*.md`; only `process.env.GEMINI_API_KEY` references | clean | — |
| S8 ✓ | — | `app/api/*/route.ts` | LLM output always `gameSpecSchema.safeParse`d before use (`generateSpec.ts:validateResponse`); no `JSON.parse` straight into renderer | clean | — |
| S9 ✓ | — | `lib/spec/schema.ts:118` | Prompt capped `min(1).max(500)` via `generateRequestSchema` | clean | — |
| S10 ✓ | — | components | No `dangerouslySetInnerHTML`; sprites/themes are fixed enums | clean | — |

### 2. Data & schema
| # | Severity | Finding | Notes |
|---|---|---|---|
| D1 | Info | No Drizzle schema, client, config, or migrations (`lib/db/` = `.gitkeep` only) | A4 not landed; `games`/`generations` tables, `games(slug)` UNIQUE / `games(owner_id)` / `generations(created_at)` indexes all N/A until then |
| D2 | Info | `games.spec` server-side validation N/A | No write route exists yet; `/api/validate` does run `safeParse` correctly |
| D3 ✓ | — | `version: z.literal("1")` enforced in `schema.ts:78`; `docs/schema.md` documents the bump-on-breaking-change policy | clean |

### 3. Reliability
| # | Severity | File:line | Finding | Fix |
|---|---|---|---|---|
| R1 | Medium | `app/api/generate/route.ts:24` | `console.log({ prompt, ... })` logs the **full user prompt**; audit requires no full-request-body logging / redaction | Redact or hash prompt; log length + template only |
| R2 | Medium | `lib/llm/client.ts:13` + `generateSpec.ts:25` | No request-level `AbortController`/overall deadline. Client timeout is 30s (not the ~15s cap the audit expects), and `requestSpec` retries up to 2× and the repair path calls it again → worst case ~4 model calls with no aggregate deadline | Add an `AbortController` with ~15s total budget; cap combined attempts |
| R3 ✓ | — | `components/renderer/GameCanvas.tsx:43` | `renderer.destroy()` called in `useEffect` cleanup → no Phaser leak on unmount | clean |
| R4 ✓ | — | both routes | All error paths return `NextResponse.json(...)` (no HTML stack traces) | clean |
| R5 | (folded into S1) | Rate-limit path-casing bypass | N/A — no rate limiter exists yet |

### 4. Performance
| # | Severity | Finding | Evidence |
|---|---|---|---|
| P1 ✓ | — | Phaser is **lazy-loaded** via `await import("phaser")` inside `mount()` (all three renderers), not statically bundled | `/play-demo` First Load JS = 107 kB; build output |
| P2 ✓ | — | `SYSTEM_PROMPT` is built once at module load (`const`), not per-request | `lib/llm/systemPrompt.ts` |
| P3 ✓ | — | No page-route chunk exceeds 250 kB gzipped; largest First Load is `/new` at 119 kB | `next build` output |
| P4 | Info | `next/image` / thumbnail sizing N/A | no images rendered yet (A4) |

Build route table (from `next build`):
```
/                1.74 kB  / 104 kB
/new             16 kB    / 119 kB
/play-demo       4.23 kB  / 107 kB
/api/generate    127 B    / 103 kB
/api/validate    127 B    / 103 kB
shared           103 kB
```

### 5. Observability
| # | Severity | Finding |
|---|---|---|
| O1 | Medium | No Sentry / error tracking anywhere (`lib/observability/` does not exist). API routes are unwrapped. |
| O2 | Info | No eval harness — `scripts/eval/` does not exist (A6 not started); no `report.json` |
| O3 | Info | `generations` rows not persisted; generate route emits `latencyMs`/`status`/`repaired` via `console.log` only (no DB; A4/A6) |

### 6. Type & build health
| # | Severity | Result |
|---|---|---|
| B1 ✓ | — | `tsc --noEmit` — **green** |
| B2 ✓ | — | `vitest run` — **green** (16 passed, 1 skipped: live-Gemini test gated by `GEMINI_API_KEY`) |
| B3 ✓ | — | `next build` — **green** |
| B4 | High | `next lint` — **not configured**, interactive prompt, non-zero exit (see Top-fix #2) |
| B5 ✓ | — | No `@ts-ignore` / `@ts-expect-error` / `: any` / `as any` in `lib`/`app`/`components` (grep count 0) |
| B6 | Low | `next.config.mjs:4` `experimental.typedRoutes` deprecated → build warns "moved to `typedRoutes`" |

### 7. Contract integrity
| # | Severity | Finding |
|---|---|---|
| C1 ✓ | — | `lib/spec/schema.ts` and `lib/renderer/GameRenderer.ts` retain their frozen-banner headers and match their contracts; no unsynced edits |
| C2 ✓ | — | All three renderers (`platformer`/`shooter`/`runner`) implement the full `GameRenderer<TSpec>` interface (`mount`/`update`/`destroy`/`snapshot`); no `@ts-expect-error` |
| C3 ✓ | — | Example specs (`lib/spec/examples/*`) all pass `gameSpecSchema.safeParse` — asserted by `tests/spec/game-spec.test.ts` |

### 8. Deployment readiness
| # | Severity | Finding |
|---|---|---|
| DP1 | High | Env drift — code needs `GEMINI_API_KEY`/`GEMINI_MODEL`, `.env.example` ships `ANTHROPIC_API_KEY` (see Top-fix #3) |
| DP2 | Low | `@anthropic-ai/sdk` dependency unused (imported nowhere) |
| DP3 | Info | Project not linked to Vercel (no `.vercel/`) → `vercel env ls` and preview-deploy checks not runnable from here; could not verify env presence in the Vercel project or curl a preview URL |
| DP4 | Info | No `vercel.json` → framework defaults (fine) |
| DP5 | Info | Public-route curl checks (`/` = 200, unknown `/g/[slug]` = 404) not runnable — no preview deploy and `/g/[slug]` route not implemented (A4) |

---

## Verified-clean checklist
- [x] No secrets committed; `.env.local` untracked; `.gitignore` covers env / `.vercel` / `node_modules` / build dirs
- [x] LLM output always validated through Zod before use; no raw `JSON.parse` into renderer
- [x] Prompt length capped (≤500) at the schema boundary
- [x] No `dangerouslySetInnerHTML`; sprite/theme values are fixed enums
- [x] Renderer `destroy()` on unmount (no Phaser leak)
- [x] All API error paths return JSON
- [x] Phaser dynamically imported (not in initial bundle); no route chunk >250 kB
- [x] System prompt is static/module-level
- [x] `tsc` green · `vitest` green · `next build` green
- [x] No `any` / `ts-ignore` / `ts-expect-error`
- [x] Frozen contracts (`schema.ts`, `GameRenderer.ts`) intact; all renderers conform; examples validate

---

## Commands run (appendix)
```
git ls-files | grep -i env ; git ls-files --error-unmatch .env.local
grep -rEn "GEMINI_API_KEY|CLERK_SECRET|DATABASE_URL|BLOB_READ_WRITE_TOKEN|ANTHROPIC_API_KEY" --include=*.ts --include=*.tsx --include=*.md .
cat PLAN.md docs/api.md docs/schema.md docs/architecture.md AGENTS.md
cat app/api/generate/route.ts app/api/validate/route.ts lib/llm/*.ts lib/spec/schema.ts
cat components/renderer/GameCanvas.tsx components/editor/GameCanvas.tsx components/marketing/PromptGenerator.tsx
grep -rn 'import("phaser")' lib/renderer ; grep -rn "ts-ignore|ts-expect-error|: any| as any" lib app components
# node 20.20.1 via nvm (pnpm 9 needs node>=22.13; ran binaries directly):
./node_modules/.bin/tsc --noEmit              # green
./node_modules/.bin/vitest run                # 16 pass / 1 skip
./node_modules/.bin/next lint                 # unconfigured -> interactive, fails
./node_modules/.bin/next build                # green; captured route sizes
gh run list --limit 5 ; gh run view 26704905160 --log-failed   # pnpm version conflict
ls .vercel  # absent -> not linked
```

---

## Verdict
**BLOCKERS PRESENT** — 0 Critical, 5 High. CI is fully red on `main` (pnpm version conflict) and the lint gate is unconfigured, so the merge gate is non-functional; env drift, missing rate limit, and missing CSP must be resolved before the generate path or any public route ships.
