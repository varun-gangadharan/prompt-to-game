# AGENTS.md — parallelization plan

Open one terminal per agent. Each agent owns a folder set + a contract file. **Nobody edits another agent's owned files.** Cross-agent communication happens through the frozen contracts (`lib/spec/schema.ts`, `lib/renderer/GameRenderer.ts`, `docs/api.md`).

---

## Kickoff order

```
        M0 (A3 alone, ~1 day) — freezes schema + API shapes
              │
   ┌──────────┼──────────┐
   ▼          ▼          ▼
   A1         A2         (A4 waits)
 Shell    Renderer T1
              │
              ▼ (renderer interface stable)
              A5  ←── Templates T2 + T3
              │
              ▼ (core paths exist)
              A4  ←── Save / publish / share
              │
              ▼
              A6  ←── Tests + docs + eval harness
```

---

## Agent assignments

### A3 — Spec & API (start first, blocks everyone)
**Owns:**
- `lib/spec/**` (schema, types, examples)
- `lib/llm/**`
- `app/api/generate/route.ts`
- `app/api/validate/route.ts`
- `docs/api.md`, `docs/schema.md`

**Done when:** Zod schema exported, 3 example specs validate in `tests/spec/`, stub `/api/generate` returns a valid spec for any prompt. Real LLM path lands in M2.

**Suggested prompt to spin up the agent:**
> Read `PLAN.md` §3 and `AGENTS.md` (A3). Implement `lib/spec/schema.ts` as the canonical Zod GameSpec, write three example specs (one per template) in `lib/spec/examples/`, add a stub `/api/generate` returning the platformer example, and a `/api/validate` route. Add Vitest tests in `tests/spec/`. Do NOT touch renderer or UI files.

---

### A1 — Shell (landing + editor UI)
**Owns:**
- `app/page.tsx`, `app/new/page.tsx`
- `components/marketing/**`, `components/editor/**`, `components/share/ShareDialog.tsx`
- Tailwind config

**Depends on:** A3's schema (import only).

**Done when:** Landing has working prompt box that POSTs `/api/generate`, navigates to `/new` with the returned spec, and renders a params panel auto-generated from the Zod schema. Renderer mount is a placeholder div.

**Prompt:**
> Read `PLAN.md` §2/§4 and `AGENTS.md` (A1). Build the landing page with prompt input and the `/new` editor shell. Auto-generate the params panel from the Zod schema in `lib/spec/schema.ts`. Use a `<GameCanvas spec={spec} />` placeholder — do not implement rendering. Wire prompt submit → `/api/generate` → push to `/new`.

---

### A2 — Renderer interface + Template 1 (platformer)
**Owns:**
- `lib/renderer/GameRenderer.ts` (interface — **frozen** at end of M1)
- `lib/renderer/platformer/**`
- `lib/renderer/shared/**`
- `components/renderer/GameCanvas.tsx`
- `app/play-demo/page.tsx` (demo route, can be removed later)

**Depends on:** A3's schema.

**Done when:** `/play-demo` loads and is playable with keyboard. Renderer accepts any valid platformer spec without code changes (tested with 3 hand-written specs).

**Prompt:**
> Read `PLAN.md` §2 and `AGENTS.md` (A2). Define `GameRenderer` interface (mount, update, destroy, snapshot). Implement Phaser-based platformer renderer that consumes a platformer GameSpec. Create `/play-demo` route loading one of A3's example specs. Add `tests/renderer/platformer.test.ts` with 3 specs.

---

### A5 — Templates 2 & 3 (shooter + runner)
**Owns:**
- `lib/renderer/shooter/**`
- `lib/renderer/runner/**`

**Depends on:** A2's renderer interface (frozen).

**Done when:** Both modules conform to `GameRenderer`. Each has at least 3 example specs that pass renderer contract tests.

**Prompt:**
> Read `AGENTS.md` (A5). Implement Shooter and Runner renderers conforming to `lib/renderer/GameRenderer.ts`. Add the same contract tests A2 wrote, parameterized over template. Do not modify the interface or other renderers' files.

---

### A4 — Persistence, auth, share
**Owns:**
- `lib/db/**` (Drizzle schema + client)
- `lib/auth/**` (Clerk helpers)
- `app/api/games/**`, `app/api/og/**`
- `app/g/[slug]/page.tsx`, `app/me/page.tsx`
- `lib/thumbnail/capture.ts`

**Depends on:** schema (A3) + renderer mount (A2).

**Done when:** Auth'd user can save, see on `/me`, publish, and a public incognito `/g/[slug]` plays the game. OG image renders.

**Prompt:**
> Read `PLAN.md` §4/§5 and `AGENTS.md` (A4). Set up Drizzle schema for `games` and `generations`. Add Clerk auth. Implement `/api/games*` CRUD + publish, `/g/[slug]` public play page, `/me` list, thumbnail capture via canvas snapshot to Vercel Blob, and OG image route. Do not modify schema or renderer files.

---

### A6 — Tests, docs, eval harness
**Owns:**
- `tests/api/**`, `tests/e2e/**` (Playwright)
- `docs/**` (except files owned by A3)
- `scripts/eval/**` — 50-prompt eval harness

**Starts:** when M3 lands.

**Done when:** e2e prompt→play test green, eval harness reports % schema-valid + % playable, docs site builds.

---

## Coordination rules

1. **No agent edits another's files.** PRs that touch foreign paths get rejected.
2. **Contracts are frozen once shipped.** Changes to `schema.ts` or `GameRenderer.ts` require a sync with all agents.
3. **Mocks live in `lib/spec/examples/`.** Anyone can develop offline against them.
4. **One branch per agent** — `agent/a1-shell`, `agent/a2-renderer`, etc. Merge to `main` only when contract tests pass.
5. **Daily integration:** rebase on `main` at start of each session.

---

## Conflict matrix (who touches what)

| Path | Owner |
|---|---|
| `lib/spec/**` | A3 |
| `lib/llm/**` | A3 |
| `app/api/generate`, `app/api/validate` | A3 |
| `app/page.tsx`, `app/new/**`, `components/editor/**`, `components/marketing/**` | A1 |
| `lib/renderer/GameRenderer.ts`, `lib/renderer/platformer/**`, `lib/renderer/shared/**`, `components/renderer/**` | A2 |
| `lib/renderer/shooter/**`, `lib/renderer/runner/**` | A5 |
| `lib/db/**`, `lib/auth/**`, `lib/thumbnail/**`, `app/api/games/**`, `app/api/og/**`, `app/g/**`, `app/me/**` | A4 |
| `tests/**` (except `tests/spec/**`), `docs/**` (except schema/api refs), `scripts/eval/**` | A6 |
