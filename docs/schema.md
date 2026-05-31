# GameSpec schema

Source of truth: `lib/spec/schema.ts` (Zod).

```ts
type GameSpec = {
  version: "1";
  id: string;             // uuid
  title: string;          // <= 60
  template: "platformer" | "shooter" | "runner";
  theme: {
    palette: [string, string, string, string]; // [bg, primary, accent, danger] hex
    spriteSet: "blocks" | "pixel" | "neon";
    music: "none" | "chip-a" | "chip-b";
  };
  player: {
    speed: number;        // 1..10
    jump?: number;        // 1..10 (platformer/runner)
    health: number;       // 1..10
  };
  world: {
    width: number;
    height: number;
    gravity?: number;     // platformer/runner
    scrollSpeed?: number; // runner
  };
  entities: Entity[];     // template-specific variants
  goal: {
    type: "reach" | "score" | "survive";
    target: number;
  };
  difficulty: "easy" | "normal" | "hard";
};
```

## Entity variants

**Platformer** — `platform | coin | hazard | goal` (each has `{x,y,w?,h?}`).
**Shooter** — `enemy | spawner | pickup`.
**Runner** — `obstacle-low | obstacle-high | pickup`.

## Compatibility

- Additive changes only.
- Bump `version` on any breaking change.
- Old specs must always remain playable.
