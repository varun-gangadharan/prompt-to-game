# PLAN.md — prompt-to-game

End-to-end plan. The matching agent assignments live in [`AGENTS.md`](./AGENTS.md).

---

## 1. Product

A web app where a user types a natural-language prompt (e.g. *"a platformer where a cat dodges falling toast"*), the system produces a structured **GameSpec**, and the user lands in a browser editor with an instantly playable game. Tweak parameters in a side panel, save, share by URL.

**Core loop:** Prompt → GameSpec → Play → Edit params → Save → Share.

**Templates (hard cap at 3):**
1. **Platformer** — side-scroll, gravity, jump, collectibles, hazards, goal tile.
2. **Top-down Shooter** — 8-dir movement, projectiles, enemy waves, score.
3. **Endless Runner** — auto-scroll, single-input jump/duck, procedural obstacles, distance score.

**Out of scope (v1):** multiplayer, custom asset uploads, monetization, mobile-native, accounts beyond basic auth.

---

## 2. Architecture

```
┌──────────────┐   prompt    ┌──────────────────┐   GameSpec   ┌─────────────────┐
│ Landing/     │────────────▶│ /api/generate    │─────────────▶│ Editor Shell    │
│ Editor Shell │             │ (LLM → spec)     │              │ (params panel)  │
└──────────────┘             └──────────────────┘              └────────┬────────┘
        ▲                            │                                   │ spec
        │ share URL                  ▼ validate                          ▼
┌──────────────┐             ┌──────────────────┐              ┌─────────────────┐
│ Public Play  │◀────────────│ /api/games (CRUD)│◀─────────────│ GameRenderer    │
│ Page         │   spec      │ + /api/validate  │   save       │ (per template)  │
└──────────────┘             └──────────────────┘              └─────────────────┘
```

**Parallelization seams** (these contracts let agents work alone):
- **GameSpec schema** (`lib/spec/schema.ts`) — single source of truth, Zod.
- **`GameRenderer` interface** (`lib/renderer/GameRenderer.ts`) — all templates conform.
- **API route shapes** (`docs/api.md`) — frozen at M0 so UI can mock.

---

## 3. GameSpec (v1) — frozen contract

Discriminated union on `template`. Validated server-side; same Zod schema feeds the editor's auto-form.

```
GameSpec {
  version: "1"
  id: uuid
  title: string (<=60)
  template: "platformer" | "shooter" | "runner"
  theme: {
    palette: [hex, hex, hex, hex]   // bg, primary, accent, danger
    spriteSet: "blocks" | "pixel" | "neon"
    music: "none" | "chip-a" | "chip-b"
  }
  player: { speed: 1..10, jump?: 1..10, health: 1..10 }
  world:  { width, height, gravity?, scrollSpeed? }
  entities: Entity[]                  // template-specific variants
  goal:    { type: "reach"|"score"|"survive", target: number }
  difficulty: "easy" | "normal" | "hard"
}
```

Entity variants narrow by template (platformer: `platform|coin|hazard|goal`; shooter: `enemy|spawner|pickup`; runner: `obstacle-low|obstacle-high|pickup`).

**Compat rule:** changes are additive + version-bumped. Old specs always play.

---

## 4. Route map

**Pages**
- `/` landing + prompt box
- `/new` editor shell (loads spec, mounts renderer, params panel)
- `/g/[slug]` public play page (embeddable)
- `/me` saved games (auth)

**API**
- `POST /api/generate` — `{prompt}` → `{spec}` (LLM + validate + repair retry)
- `POST /api/validate` — `{spec}` → `{ok, errors[]}`
- `POST /api/games` — create (auth)
- `GET  /api/games/[id]` — fetch
- `PATCH /api/games/[id]` — update
- `POST /api/games/[id]/publish` — mint slug + thumbnail
- `GET  /api/og/[slug]` — OG image

---

## 5. DB schema

```
games
  id uuid pk
  owner_id text fk users.id
  title text
  template text
  spec jsonb                  -- validated GameSpec
  visibility 'private'|'unlisted'|'public'
  slug text unique nullable
  thumbnail_url text nullable
  created_at, updated_at timestamptz
  play_count int default 0

generations            -- LLM call log; powers eval + iteration
  id uuid pk
  user_id text nullable
  prompt text
  spec jsonb nullable
  status 'ok'|'invalid'|'error'
  latency_ms int
  created_at timestamptz
```

---

## 6. Milestones (each independently shippable)

| # | Name | Ships |
|---|---|---|
| **M0** | Contract freeze | Zod schema + stub `/api/generate`; page renders JSON spec |
| **M1** | Template 1 playable | `/play-demo` runs platformer from hand-written spec |
| **M2** | Prompt → spec (real LLM) | Type prompt → playable platformer end-to-end |
| **M3** | Editor params panel | Tweak fields, live re-mount on change |
| **M4** | Save / publish / share | Auth, `/me`, `/g/[slug]`, OG image |
| **M5** | Templates 2 & 3 | Shooter + runner; prompt routes correct template |
| **M6** | Hardening | Eval set, rate limits, abuse filter, Sentry, docs site |

---

## 7. Acceptance criteria

**M0** — Zod schema exported; `pnpm test` validates 3 example specs (one per template). Stub `/api/generate` returns valid spec <200ms.

**M1** — `/play-demo` is playable; renderer accepts any valid platformer spec without code changes (tested with 3 hand-written specs).

**M2** — 95% of a 20-prompt smoke set produce schema-valid spec on first try; 100% after one repair retry. p50 prompt→playable <6s, p95 <12s.

**M3** — Editing any field updates running game within 500ms; invalid edits blocked at the form layer.

**M4** — User can save → see on `/me` → publish → load `/g/[slug]` incognito and play. Share has thumbnail OG.

**M5** — Prompt clearly indicating shooter or runner routes correctly ≥90% on a 30-prompt eval set. All three templates pass the same renderer contract tests.

**M6** — 50-prompt eval: ≥90% playable, no console errors. Rate limit 10 gens/min/IP. Public docs site with schema reference + embed snippet.
