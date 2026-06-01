import { describe, expect, it } from "vitest";

import type { GameRenderer } from "../../lib/renderer/GameRenderer";
import {
  buildShooterWorld,
  createShooterRenderer,
} from "../../lib/renderer/shooter";
import { shooterGameSpecSchema } from "../../lib/spec/schema";
import type { ShooterGameSpec } from "../../lib/spec/types";

const specs: ShooterGameSpec[] = [
  {
    version: "1",
    id: "77777777-7777-4777-8777-777777777777",
    title: "Empty Arena",
    template: "shooter",
    theme: {
      palette: ["#101010", "#f2f2f2", "#7df9ff", "#ff3366"],
      spriteSet: "blocks",
      music: "none",
    },
    player: { speed: 5, health: 3 },
    world: { width: 960, height: 540 },
    entities: [],
    goal: { type: "score", target: 0 },
    difficulty: "easy",
  },
  {
    version: "1",
    id: "88888888-8888-4888-8888-888888888888",
    title: "Max Swarm",
    template: "shooter",
    theme: {
      palette: ["#05060a", "#20fc8f", "#fdff12", "#ff2e63"],
      spriteSet: "neon",
      music: "chip-b",
    },
    player: { speed: 10, health: 10 },
    world: { width: 1920, height: 1080, scrollSpeed: 10 },
    entities: [
      { type: "spawner", x: 120, y: 120, w: 42, h: 42 },
      { type: "spawner", x: 1760, y: 860, w: 42, h: 42 },
      { type: "enemy", x: 900, y: 180, w: 40, h: 40 },
      { type: "pickup", x: 500, y: 520, w: 28, h: 28 },
    ],
    goal: { type: "score", target: 5000 },
    difficulty: "hard",
  },
  {
    version: "1",
    id: "99999999-9999-4999-8999-999999999999",
    title: "Museum Static",
    template: "shooter",
    theme: {
      palette: ["#fffb00", "#0033ff", "#ff00aa", "#00ff44"],
      spriteSet: "pixel",
      music: "chip-a",
    },
    player: { speed: 1, health: 1 },
    world: { width: 720, height: 720, scrollSpeed: 1 },
    entities: [
      { type: "enemy", x: 60, y: 60 },
      { type: "pickup", x: 600, y: 600 },
    ],
    goal: { type: "score", target: 100 },
    difficulty: "normal",
  },
];

describe("shooter renderer contract", () => {
  it("exports a GameRenderer implementation", () => {
    const renderer: GameRenderer<ShooterGameSpec> = createShooterRenderer();

    expect(renderer.mount).toEqual(expect.any(Function));
    expect(renderer.update).toEqual(expect.any(Function));
    expect(renderer.destroy).toEqual(expect.any(Function));
    expect(renderer.snapshot).toEqual(expect.any(Function));
  });

  it.each(specs)("accepts valid shooter spec: $title", (spec) => {
    expect(shooterGameSpecSchema.safeParse(spec).success).toBe(true);

    const world = buildShooterWorld(spec);

    expect(world.width).toBe(spec.world.width);
    expect(world.height).toBe(spec.world.height);
    expect(world.playerSpeed).toBeGreaterThan(0);
    expect(world.projectileSpeed).toBeGreaterThan(world.playerSpeed);
    expect(world.spawnIntervalMs).toBeGreaterThan(0);
    expect(world.scoreTarget).toBe(spec.goal.target);
    expect(world.enemies.length + world.spawners.length + world.pickups.length).toBe(
      spec.entities.length,
    );
  });
});
