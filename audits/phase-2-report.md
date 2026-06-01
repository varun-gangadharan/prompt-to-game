# Production-Readiness Audit — Phase 2

- **Repo:** prompt-to-game
- **Branch / HEAD:** `main` @ `ddd8abb` — *fix: resolve phase-1 audit High findings (#1-#5)*
- **Date:** 2026-06-01
- **Auditor:** Production-Readiness Auditor (read-only — no source files modified)
- **Prior baseline:** `audits/phase-1-report.md` (`@2a4e664`, 0 Critical / 5 High)

> **No leaked key, no exposed admin route.** `.env.local` is present on disk but **untracked** (`git ls-files` clean); `.gitignore` covers `.env*`. Repo-wide secret grep finds only `process.env.GEMINI_API_KEY`/`GEMINI_MODEL` references — no literal keys. No admin/privileged route exists in the codebase.

> **Note — state moved during the audit.** At session start `HEAD` was `2a4e664` with the phase-1 fixes sitting uncommitted in the working tree. Mid-audit the developer committed them as `ddd8abb` ("resolve phase-1 audit High findings #1-#5"). **This report reflects the committed `ddd8abb` state**, which the working tree now matches exactly (`git status` clean). All five phase-1 High findings are resolved (verified below).

> **Milestone context (unchanged from phase 1).** Per `AGENTS.md`, only **M0** (schema/API), **M1** (platformer + shell), **M2** (Gemini path, shooter/runner) have landed. **A4** (db / auth / `/api/games*` / `/api/og` / `/g/[slug]` / `/me`) and **A6** (eval harness / e2e / Sentry / docs site) are **not built** — those dirs hold only `.gitkeep`. Findings that depend on A4/A6 are recorded as **Info** (correctly-not-yet-built), not defects, except where a guardrail should be staged before those routes ship.

---

## 1. Summary — counts by severity

| Severity | Count | vs Phase 1 |
|---|---|---|
| Critical | 0 | = |
| High | 0 | ▼ 5 (all resolved) |
| Medium | 4 | ▼ 1 |
| Low | 2 | ▼ 1 |
| Info | 8 | ▲ 1 |

**No Critical or High findings.** All five phase-1 Highs (CI pnpm conflict, unconfigured lint, env drift, missing rate limit, missing CSP) are fixed in `ddd8abb`. Remaining items are hardening/observability gaps, most of which are explicitly scoped to the not-yet-started **M6** milestone.

Toolchain on `ddd8abb` (run locally via Node 20.20.1; `pnpm` itself requires Node ≥22.13 so binaries were invoked directly):

| Gate | Result |
|---|---|
| `tsc --noEmit` (typecheck) | ✅ green |
| `next lint` (lint) | ✅ green — "No ESLint warnings or errors" |
| `vitest run` (test) | ✅ 16 passed / 1 skipped (live-Gemini test gated on `GEMINI_API_KEY`) |
| `next build` (build) | ✅ green; largest shared chunk 54.2 KB, no chunk >250 KB gz |

---

## 2. Top 5 fixes (severity-ordered)

The five phase-1 Highs are resolved, so the highest-value remaining work is now Medium. In priority order:

### 1. [Medium] LLM request has no aggregate deadline / `AbortController` — `lib/llm/client.ts:14`
The Gemini client sets `httpOptions.timeout: 30_000` (30 s) **per call**, not the ~15 s cap the readiness bar expects. `requestSpec()` (`lib/llm/generateSpec.ts:28`) loops up to 2 attempts, and the repair path (`generateSpec.ts:110`) calls `requestSpec()` again → **worst case ~4 sequential model calls with no overall budget** (≈120 s wall-clock). This breaks `PLAN.md §7 M2` (`p95 prompt→playable <12 s`) and holds a serverless invocation open far longer than intended. **Fix:** wrap the whole `generateSpec` flow in an `AbortController` with a ~15 s total budget passed into `generateContent({ ..., abortSignal })`, and drop the per-call timeout to match. The retry is already bounded (good); only the deadline is missing.

### 2. [Medium] No prompt abuse / content filter before the paid model call — `app/api/generate/route.ts`
The endpoint now rate-limits and length-caps (≤500), but there is no keyword/category filter or moderation pass before spending a Gemini call. `PLAN.md §6 M6` lists "abuse filter" as a deliverable. With the endpoint public + unauthenticated, this is the remaining input-abuse gap (cost vector is otherwise bounded by the rate limit; output is schema-constrained, limiting harmful-content risk). **Fix:** add a cheap pre-call filter (blocklist + length/entropy heuristics) returning `400` before `generateSpec()`.

### 3. [Medium] Rate limiter is per-instance, not a global ceiling — `lib/llm/rateLimit.ts:14`
The in-memory fixed-window limiter (10/min/key) is honest about being "a floor, not a ceiling" in its header comment. On Fluid Compute / multiple concurrent instances the effective limit is `10 × instances`, and it resets on cold start. It satisfies `PLAN.md` "10 gens/min/IP" functionally but is not a hard cost cap under load. **Fix (before public launch):** back it with a shared store (Upstash Redis / Vercel KV) or a Vercel WAF rate-limit rule. Acceptable for current pre-A4 state.

### 4. [Medium] No error tracking / Sentry anywhere — observability
No `Sentry` init, no `lib/observability/`. API routes are not wrapped; failures surface only via `console.log`. Scoped to **M6** but should land before any public route (A4). **Fix:** add `@sentry/nextjs` init + wrap route handlers; route the existing `{status, latencyMs, repaired}` metric through it.

### 5. [Low] Generation metrics are logged but not persisted — `app/api/generate/route.ts:38`
The route emits `{promptLength, template, status, latencyMs, repaired}` via `console.log` (correctly redacted — no raw prompt). The `generations` table (`PLAN.md §5`) that should capture `latency_ms + status + repaired` for eval is not yet created (A4/A6). **Fix:** persist these rows once the DB lands so the M6 eval harness has data.

*(No High/Critical findings → no GitHub issues were created, per the issue-filing threshold.)*

---

## 3. Full findings by category

### 1. Security
| # | Severity | File:line | Finding | Status |
|---|---|---|---|---|
| S1 | ✅ Resolved | `app/api/generate/route.ts:11`, `lib/llm/rateLimit.ts` | Rate limit added → `429` + `Retry-After` (10/min/key). Path is fixed by App Router file, so casing/trailing-slash can't bypass. | was High #4 |
| S2 | ✅ Resolved | `next.config.mjs:8-38` | Baseline CSP + `X-Content-Type-Options: nosniff` + `Referrer-Policy: strict-origin-when-cross-origin` + `X-Frame-Options: SAMEORIGIN` on `/:path*`. CSP notes `unsafe-eval` (Phaser) and `frame-ancestors 'self'`. | was High #5 |
| S3 | Medium | `app/api/generate/route.ts` | No prompt abuse/content filter pre-call (M6) | See Top-fix #2 |
| S4 | Medium | `lib/llm/rateLimit.ts:14` | Limiter per-instance, not global ceiling | See Top-fix #3 |
| S5 | Info | (absent) `middleware.ts` | No Clerk middleware yet — must add a matcher gating `/me` + `/api/games*` **when A4 lands** (Next defaults to ungated) | A4 not built |
| S6 ✅ | — | repo-wide | No `dangerouslySetInnerHTML` / `innerHTML` / `eval(` in `app`/`components`/`lib` | clean |
| S7 ✅ | — | `lib/spec/schema.ts:102` | Prompt capped `min(1).max(500)` at the schema boundary | clean |
| S8 ✅ | — | both API routes | LLM output always `gameSpecSchema.safeParse`d before use (`generateSpec.ts:73`); `/api/validate` re-parses; no raw `JSON.parse` into renderer | clean |
| S9 ✅ | — | `.gitignore`, `git ls-files` | No secrets committed; `.env.local` untracked; `.gitignore` covers `.env*`, `.vercel`, `node_modules`, `.next`, **now `.claude` + `*.tsbuildinfo`** | clean (phase-1 S5 fixed) |
| S10 | Info | A4 routes | SQL-injection / SSRF / OG-slug validation N/A — no DB, no user-driven outbound fetch, no `/api/og` route yet. Only outbound call is to the fixed Gemini endpoint. | A4 not built |

### 2. Data & schema
| # | Severity | Finding | Notes |
|---|---|---|---|
| D1 | Info | No Drizzle schema/client/config/migrations (`lib/db/` = `.gitkeep`) | `games`/`generations` tables, `games(slug)` UNIQUE / `games(owner_id)` / `generations(created_at)` indexes, drift check — all N/A until A4. `drizzle-kit` scripts exist in `package.json` but no `drizzle.config.*`. |
| D2 ✅ | — | `lib/spec/schema.ts:67` | `version: z.literal("1")` enforced; `docs/schema.md` documents additive-only + bump-on-break policy | clean |
| D3 ✅ | — | `lib/spec/examples/*` | All three example specs `safeParse` — asserted by `tests/spec/game-spec.test.ts` (4 tests green) | clean |

### 3. Reliability
| # | Severity | File:line | Finding |
|---|---|---|---|
| R1 ✅ | — | `app/api/generate/route.ts:38,53` | Now logs `promptLength` (+ comment "never the raw prompt"), not the raw body | phase-1 R1 fixed |
| R2 | Medium | `lib/llm/client.ts:14` + `generateSpec.ts:28,110` | 30 s per-call timeout (not ~15 s); no aggregate `AbortController`; up to ~4 sequential calls | See Top-fix #1 |
| R3 ✅ | — | `components/renderer/GameCanvas.tsx:44` | `renderer.destroy()` in `useEffect` cleanup → no Phaser leak on unmount | clean |
| R4 ✅ | — | both routes | All error paths return `NextResponse.json(...)` — no HTML stack traces | clean |
| R5 ✅ | — | `lib/llm/generateSpec.ts` | Repair retry is bounded: 1 repair round after the first failure, then throws `UnrepairableGameSpecError` → `422` | clean |

### 4. Performance
| # | Severity | Finding | Evidence |
|---|---|---|---|
| P1 ✅ | — | Phaser lazy-loaded via `await import("phaser")` inside `mountAsync()` in all three renderers — not in initial bundle | `lib/renderer/{platformer,shooter,runner}/*Renderer.ts` |
| P2 ✅ | — | `SYSTEM_PROMPT` built once at module load (`const`), not per request | `lib/llm/systemPrompt.ts:20` |
| P3 ✅ | — | No chunk >250 KB gz; largest shared chunk 54.2 KB; largest First Load `/new` = 122 KB | `next build` (below) |
| P4 | Info | `next/image` usage N/A — no `<img>`/`next/image` rendered yet (A4 thumbnails/OG) | A4 not built |

Build route table (`next build` @ `ddd8abb`):
```
Route (app)                Size      First Load JS
/                          1.74 kB   104 kB
/_not-found                990 B     104 kB
/api/generate              127 B     103 kB
/api/validate              127 B     103 kB
/new                       19.2 kB   122 kB
/play-demo                 4.23 kB   107 kB
+ First Load JS shared               103 kB
  ├ chunks/57d68…           54.2 kB
  └ chunks/678…             46.4 kB
```

### 5. Observability
| # | Severity | Finding |
|---|---|---|
| O1 | Medium | No Sentry / error tracking; routes unwrapped (M6) — see Top-fix #4 |
| O2 | Info | No eval harness (`scripts/eval/` absent), no `report.json` (A6 not started) |
| O3 | Low | `generations` metrics (`latency_ms`/`status`/`repaired`) logged via `console.log` only, not persisted (no DB; A4/A6) — see Top-fix #5 |

### 6. Type & build health
| # | Severity | Result |
|---|---|---|
| B1 ✅ | — | `tsc --noEmit` — green |
| B2 ✅ | — | `next lint` — green ("No ESLint warnings or errors"); `.eslintrc.json` extends `next/core-web-vitals` (phase-1 High #2 fixed) |
| B3 ✅ | — | `vitest run` — 16 pass / 1 skip |
| B4 ✅ | — | `next build` — green |
| B5 ✅ | — | No `@ts-ignore` / `@ts-expect-error` / `: any` / `as any` in `app`/`components`/`lib` (git grep = 0) |
| B6 ✅ | — | `experimental.typedRoutes` → top-level `typedRoutes` (phase-1 Low B6 fixed) |

### 7. Contract integrity
| # | Severity | Finding |
|---|---|---|
| C1 ✅ | — | `lib/spec/schema.ts` & `lib/renderer/GameRenderer.ts` last modified in `2bd1e40` (their freeze commit); **not touched** by `ddd8abb` or `2a4e664`. Frozen banners intact. |
| C2 ✅ | — | All three renderers implement the full `GameRenderer<TSpec>` interface (`mount`/`update`/`destroy`/`snapshot`); no `@ts-expect-error` |
| C3 ✅ | — | Example specs all pass `gameSpecSchema.safeParse` (tests green) |

### 8. Deployment readiness
| # | Severity | Finding |
|---|---|---|
| DP1 ✅ | — | Env parity restored — `.env.example` now ships `GEMINI_API_KEY` + optional `GEMINI_MODEL`; code reads only those two `process.env` vars (phase-1 High #3 fixed). Future A4 vars (`DATABASE_URL`, Clerk, Blob) are declared ahead of use — harmless. |
| DP2 ✅ | — | `@anthropic-ai/sdk` removed from `package.json`; `@google/genai` is the only LLM dep (phase-1 DP2 fixed) |
| DP3 | Info | Project not linked to Vercel (no `.vercel/`) → could not run `vercel env ls` to confirm parity against the deployed project, nor curl a preview URL |
| DP4 | Info | CI workflow runs `typecheck`/`lint`/`test` but **not `build`** — adding a build step would catch build-only regressions (e.g. RSC/route typing) |
| DP5 | Info | No `vercel.json`/`vercel.ts` → framework defaults (fine for now) |

---

## 4. Verified-clean checklist
- [x] No secrets committed; `.env.local` untracked; `.gitignore` covers env / `.vercel` / build dirs / `.claude` / `*.tsbuildinfo`
- [x] No leaked key; no exposed admin route
- [x] LLM output always validated through Zod (`gameSpecSchema.safeParse`) before render; no raw `JSON.parse` into renderer
- [x] Prompt length capped (≤500) at the schema boundary
- [x] Rate limit on `/api/generate` → `429` + `Retry-After` (path can't be casing-bypassed)
- [x] CSP + `nosniff` + `Referrer-Policy` + `X-Frame-Options` set in `next.config.mjs`
- [x] No `dangerouslySetInnerHTML` / `innerHTML` / `eval`; sprite/theme values are fixed enums
- [x] Renderer `destroy()` on unmount (no Phaser leak)
- [x] All API error paths return JSON (no HTML stack)
- [x] No full-request-body / raw-prompt logging (logs `promptLength` only)
- [x] Phaser dynamically imported; no route chunk >250 KB gz
- [x] System prompt is static / module-level
- [x] Repair retry is bounded (1 repair round → `422`)
- [x] `tsc` green · `next lint` green · `vitest` green · `next build` green
- [x] No `any` / `@ts-ignore` / `@ts-expect-error`
- [x] Frozen contracts (`schema.ts`, `GameRenderer.ts`) unchanged since freeze commit; all renderers conform; examples validate
- [x] Env parity: code ↔ `.env.example` consistent for the built (M2) surface

**Could not fully verify (environment-limited):** `vercel env ls` parity and preview-URL curl checks (project not linked); `/g/[slug]` 404 and OG-slug validation (A4 not built); Clerk middleware matcher (A4 not built).

---

## 5. Commands run (appendix)
```
git log --oneline -5 ; git status --short ; git ls-files
cat PLAN.md AGENTS.md docs/api.md docs/schema.md audits/phase-1-report.md
# (re-read after state moved): git log -1 ; git show --stat ddd8abb ; git diff --name-status 2a4e664 ddd8abb
git diff 2a4e664 ddd8abb -- lib/llm/client.ts            # empty -> client unchanged (R2 stands)
git log --oneline -- lib/spec/schema.ts lib/renderer/GameRenderer.ts   # frozen @2bd1e40
# source reads: app/api/{generate,validate}/route.ts, lib/llm/{client,generateSpec,systemPrompt,responseSchema,rateLimit}.ts,
#   lib/spec/schema.ts, lib/renderer/{GameRenderer.ts,shooter/ShooterRenderer.ts,runner/RunnerRenderer.ts},
#   components/renderer/GameCanvas.tsx, next.config.mjs, package.json, .gitignore, .env.example, .github/workflows/ci.yml, .eslintrc.json
git grep -n "dangerouslySetInnerHTML|innerHTML|eval(" -- app components lib       # none
git grep -nE "@ts-ignore|@ts-expect-error|: any|as any|<any>" -- app components lib # none
git grep -n "console\." -- app lib components                                      # generate route only (promptLength)
git grep -n "process\.env\." -- lib app components                                 # GEMINI_API_KEY, GEMINI_MODEL only
git check-ignore .claude tsconfig.tsbuildinfo ; git remote -v ; ls .vercel
# toolchain (Node 20.20.1 via nvm; pnpm 9 needs Node>=22.13, ran binaries directly):
./node_modules/.bin/tsc --noEmit                 # green
./node_modules/.bin/next lint                     # "No ESLint warnings or errors"
./node_modules/.bin/vitest run                    # 16 pass / 1 skip
./node_modules/.bin/next build                    # green; captured route sizes
```

> *Environment note:* the harness temp filesystem intermittently reported `ENOSPC (0 MB free)` and truncated some Bash stdout despite 25 GiB free on the underlying volume; affected commands were re-run via `git grep | cat` and the Read tool to obtain reliable output.

---

## Verdict

**READY TO PROCEED** — 0 Critical, 0 High. All five phase-1 High blockers are resolved in `ddd8abb`; `tsc`/`lint`/`test`/`build` are green and the frozen contracts are intact. The 4 Medium / 2 Low items are hardening and observability gaps — most explicitly scoped to the not-yet-started **M6** milestone — and should be tracked, but none blocks proceeding to **A4** (persistence / auth / share). **Before A4 ships publicly**, land the Clerk middleware matcher (S5), the shared-store rate limit (S4), and Sentry (O1); before declaring M2 done against its latency SLA, add the ~15 s `AbortController` (R2).
</content>
</invoke>
