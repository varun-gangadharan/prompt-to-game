import { describe, expect, it } from "vitest";

import type { GameRenderer } from "../../lib/renderer/GameRenderer";
import {
  buildPlatformerWorld,
  createPlatformerRenderer,
} from "../../lib/renderer/platformer";
import { platformerGameSpecSchema } from "../../lib/spec/schema";
import type { PlatformerGameSpec } from "../../lib/spec/types";

const specs: PlatformerGameSpec[] = [
  {
    version: "1",
    id: "44444444-4444-4444-8444-444444444444",
    title: "Bridge Dash",
    template: "platformer",
    theme: {
      palette: ["#102030", "#7dd181", "#ffd166", "#ef476f"],
      spriteSet: "blocks",
      music: "none",
    },
    player: { speed: 5, jump: 6, health: 3 },
    world: { width: 1800, height: 640, gravity: 8 },
    entities: [
      { type: "platform", x: 0, y: 590, w: 760, h: 50 },
      { type: "platform", x: 860, y: 500, w: 240, h: 32 },
      { type: "coin", x: 920, y: 450 },
      { type: "hazard", x: 650, y: 550, w: 48, h: 40 },
      { type: "goal", x: 1680, y: 510, w: 42, h: 80 },
    ],
    goal: { type: "reach", target: 1680 },
    difficulty: "easy",
  },
  {
    version: "1",
    id: "55555555-5555-4555-8555-555555555555",
    title: "Crystal Climb",
    template: "platformer",
    theme: {
      palette: ["#0b132b", "#5bc0be", "#f9c74f", "#f94144"],
      spriteSet: "neon",
      music: "chip-a",
    },
    player: { speed: 7, jump: 8, health: 4 },
    world: { width: 2200, height: 760, gravity: 9 },
    entities: [
      { type: "platform", x: 0, y: 710, w: 620, h: 50 },
      { type: "platform", x: 720, y: 610, w: 260, h: 28 },
      { type: "platform", x: 1120, y: 510, w: 260, h: 28 },
      { type: "coin", x: 780, y: 560 },
      { type: "coin", x: 1180, y: 460 },
      { type: "hazard", x: 960, y: 680, w: 80, h: 30 },
      { type: "goal", x: 2050, y: 620, w: 50, h: 90 },
    ],
    goal: { type: "reach", target: 2050 },
    difficulty: "normal",
  },
  {
    version: "1",
    id: "66666666-6666-4666-8666-666666666666",
    title: "Tiny Trial",
    template: "platformer",
    theme: {
      palette: ["#202020", "#f4a261", "#2a9d8f", "#e76f51"],
      spriteSet: "pixel",
      music: "chip-b",
    },
    player: { speed: 4, health: 2 },
    world: { width: 1200, height: 520 },
    entities: [
      { type: "platform", x: 0, y: 480, w: 1200, h: 40 },
      { type: "coin", x: 300, y: 430 },
      { type: "hazard", x: 580, y: 448 },
      { type: "goal", x: 1100, y: 400, h: 80 },
    ],
    goal: { type: "reach", target: 1100 },
    difficulty: "hard",
  },
];

describe("platformer renderer contract", () => {
  it("exports a GameRenderer implementation", () => {
    const renderer: GameRenderer<PlatformerGameSpec> = createPlatformerRenderer();

    expect(renderer.mount).toEqual(expect.any(Function));
    expect(renderer.update).toEqual(expect.any(Function));
    expect(renderer.destroy).toEqual(expect.any(Function));
    expect(renderer.snapshot).toEqual(expect.any(Function));
  });

  it.each(specs)("accepts valid platformer spec: $title", (spec) => {
    expect(platformerGameSpecSchema.safeParse(spec).success).toBe(true);

    const world = buildPlatformerWorld(spec);

    expect(world.width).toBe(spec.world.width);
    expect(world.height).toBe(spec.world.height);
    expect(world.platforms.length).toBeGreaterThan(0);
    expect(world.goals.length).toBeGreaterThan(0);
    expect(world.playerSpeed).toBeGreaterThan(0);
    expect(world.jumpVelocity).toBeLessThan(0);
  });
});
