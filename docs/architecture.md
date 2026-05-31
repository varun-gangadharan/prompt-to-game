# Architecture

```
app/
  page.tsx                       # landing (A1)
  new/page.tsx                   # editor shell (A1)
  g/[slug]/page.tsx              # public play (A4)
  me/page.tsx                    # user games (A4)
  api/
    generate/route.ts            # POST prompt→spec (A3)
    validate/route.ts            # POST validate spec (A3)
    games/route.ts               # POST create (A4)
    games/[id]/route.ts          # GET / PATCH (A4)
    games/[id]/publish/route.ts  # mint slug + thumb (A4)
    og/[slug]/route.tsx          # OG image (A4)

components/
  editor/                        # A1
  renderer/GameCanvas.tsx        # A2
  share/                         # A1
  marketing/                     # A1

lib/
  spec/
    schema.ts                    # Zod GameSpec (A3, frozen)
    types.ts                     # inferred types (A3)
    examples/                    # one canonical spec per template (A3)
  llm/                           # A3
  db/                            # A4
  renderer/
    GameRenderer.ts              # interface (A2, frozen after M1)
    platformer/                  # A2
    shooter/                     # A5
    runner/                      # A5
    shared/                      # A2
  thumbnail/capture.ts           # A4
  auth/                          # A4

tests/
  spec/                          # A3
  api/                           # A6
  renderer/                      # A2 (T1) + A5 (T2/T3)
  e2e/                           # A6
```

See [`AGENTS.md`](../AGENTS.md) for ownership rules.
