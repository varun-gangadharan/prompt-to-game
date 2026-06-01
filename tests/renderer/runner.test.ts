import { describe, expect, it } from "vitest";

import type { GameRenderer } from "../../lib/renderer/GameRenderer";
import {
  buildRunnerWorld,
  createRunnerRenderer,
} from "../../lib/renderer/runner";
import { runnerGameSpecSchema } from "../../lib/spec/schema";
import type { RunnerGameSpec } from "../../lib/spec/types";

const specs: RunnerGameSpec[] = [
  {
    version: "1",
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Open Track",
    template: "runner",
    theme: {
      palette: ["#ffffff", "#111111", "#0088ff", "#ff2200"],
      spriteSet: "blocks",
      music: "none",
    },
    player: { speed: 4, health: 3 },
    world: { width: 1200, height: 520 },
    entities: [],
    goal: { type: "survive", target: 300 },
    difficulty: "easy",
  },
  {
    version: "1",
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    title: "Hard Horizon",
    template: "runner",
    theme: {
      palette: ["#060606", "#f9c80e", "#43bccd", "#ea3546"],
      spriteSet: "neon",
      music: "chip-b",
    },
    player: { speed: 10, jump: 10, health: 10 },
    world: { width: 2200, height: 720, gravity: 10, scrollSpeed: 10 },
    entities: [
      { type: "obstacle-low", x: 500, y: 656, w: 70, h: 50 },
      { type: "obstacle-high", x: 820, y: 390, w: 68, h: 120 },
      { type: "pickup", x: 1140, y: 330, w: 30, h: 30 },
    ],
    goal: { type: "survive", target: 5000 },
    difficulty: "hard",
  },
  {
    version: "1",
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Color Sprint",
    template: "runner",
    theme: {
      palette: ["#00ffcc", "#ff00ff", "#001eff", "#faff00"],
      spriteSet: "pixel",
      music: "chip-a",
    },
    player: { speed: 1, jump: 1, health: 1 },
    world: { width: 760, height: 480, gravity: 1, scrollSpeed: 1 },
    entities: [
      { type: "pickup", x: 260, y: 280 },
      { type: "obstacle-low", x: 480, y: 420 },
    ],
    goal: { type: "survive", target: 100 },
    difficulty: "normal",
  },
];

describe("runner renderer contract", () => {
  it("exports a GameRenderer implementation", () => {
    const renderer: GameRenderer<RunnerGameSpec> = createRunnerRenderer();

    expect(renderer.mount).toEqual(expect.any(Function));
    expect(renderer.update).toEqual(expect.any(Function));
    expect(renderer.destroy).toEqual(expect.any(Function));
    expect(renderer.snapshot).toEqual(expect.any(Function));
  });

  it.each(specs)("accepts valid runner spec: $title", (spec) => {
    expect(runnerGameSpecSchema.safeParse(spec).success).toBe(true);

    const world = buildRunnerWorld(spec);

    expect(world.width).toBe(spec.world.width);
    expect(world.height).toBe(spec.world.height);
    expect(world.gravity).toBeGreaterThan(0);
    expect(world.scrollSpeed).toBeGreaterThan(0);
    expect(world.jumpVelocity).toBeLessThan(0);
    expect(world.scoreTarget).toBe(spec.goal.target);
    expect(world.stream).toHaveLength(spec.entities.length);
  });
});
