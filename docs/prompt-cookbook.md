# Prompt cookbook

How to write prompts that reliably generate a playable game. The generator maps
every prompt onto one of three templates — **platformer**, **shooter**, or
**runner** — and fills in a `GameSpec` (see [`schema.md`](./schema.md)). Clear
prompts pick the right template and sensible parameters; vague prompts drift.

## Anatomy of a good prompt

A strong prompt names four things:

1. **Template intent** — the verbs/nouns that imply the genre (see below).
2. **Theme** — setting, mood, or palette ("neon", "cozy", "desert", "pixel").
3. **Goal** — reach a place, hit a score, or survive a duration.
4. **Difficulty** — "easy / beginner", "normal", or "hard / brutal".

> A neon **platformer** where a cat **jumps** across bakery shelves **collecting
> cupcakes** to **reach the counter**, **normal** difficulty.

That single sentence pins template (jump/platforms/collect/reach), theme (neon
bakery), goal (reach), and difficulty (normal).

## Template cues

| Template | Say things like | Avoid (drifts elsewhere) |
|---|---|---|
| **platformer** | jump, platforms, ledges, gaps, coins/gems, hazards, *reach* a flag/door | "endless", "auto-run", "shoot" |
| **shooter** | shoot, enemies, waves, spawners, drones, *score* points, power-ups | "jump across", "reach the exit" |
| **runner** | endless/auto-run, scrolling, dodge, slide under / jump over obstacles, *survive* | "explore", "platforms to climb" |

## Good vs bad

| ✅ Good | ⚠️ Bad | Why |
|---|---|---|
| "A hard neon shooter where you survive waves of drones from spawners." | "A fun space game." | No template cue, no goal, no difficulty. |
| "Easy endless runner dodging high and low obstacles, gentle scroll." | "A runner but also you can build stuff and trade." | Out-of-scope mechanics; only 3 templates exist. |
| "Cozy platformer: a frog hops lily pads collecting flies to reach a pond." | "Make Mario." | Use mechanics, not IP; describe the loop. |
| "Top-down shooter, pixel art, chip-a music, score 3000 points." | "shooter shooter shooter" | Repetition adds nothing; name theme + goal. |

## Tips

- **Pick one goal.** "reach", "score", or "survive" — mixing them makes the
  generator guess. Give a concrete target for score/survive ("3000 points",
  "120 seconds").
- **Name a palette or mood** to get a coherent theme (`blocks | pixel | neon`).
- **Keep it under ~2 sentences.** Prompts are capped at 500 characters; extra
  prose rarely improves the spec.
- **State difficulty explicitly** if it matters; otherwise expect "normal".
- If the result feels off, **regenerate** from the editor — same prompt, new
  roll — or tune parameters directly in the params panel.
