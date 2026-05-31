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

## Repo map
See [`docs/architecture.md`](./docs/architecture.md).
