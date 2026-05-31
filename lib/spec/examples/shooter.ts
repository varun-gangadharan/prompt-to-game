import type { ShooterGameSpec } from "../types";

export const shooterExample: ShooterGameSpec = {
  version: "1",
  id: "22222222-2222-4222-8222-222222222222",
  title: "Neon Swarm",
  template: "shooter",
  theme: {
    palette: ["#070707", "#7bdff2", "#b2f7ef", "#ff5c8a"],
    spriteSet: "neon",
    music: "chip-b",
  },
  player: {
    speed: 7,
    health: 5,
  },
  world: {
    width: 1280,
    height: 720,
  },
  entities: [
    { type: "enemy", x: 820, y: 180, w: 36, h: 36 },
    { type: "enemy", x: 940, y: 520, w: 36, h: 36 },
    { type: "spawner", x: 1120, y: 360, w: 48, h: 48 },
    { type: "pickup", x: 360, y: 300, w: 28, h: 28 },
  ],
  goal: {
    type: "score",
    target: 2500,
  },
  difficulty: "hard",
};
