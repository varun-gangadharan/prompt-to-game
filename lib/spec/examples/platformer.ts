import type { PlatformerGameSpec } from "../types";

export const platformerExample: PlatformerGameSpec = {
  version: "1",
  id: "11111111-1111-4111-8111-111111111111",
  title: "Toast Canyon",
  template: "platformer",
  theme: {
    palette: ["#101820", "#f2aa4c", "#4cc9f0", "#ef476f"],
    spriteSet: "pixel",
    music: "chip-a",
  },
  player: {
    speed: 6,
    jump: 7,
    health: 3,
  },
  world: {
    width: 2400,
    height: 720,
    gravity: 9,
  },
  entities: [
    { type: "platform", x: 0, y: 680, w: 900, h: 40 },
    { type: "platform", x: 980, y: 560, w: 260, h: 28 },
    { type: "platform", x: 1340, y: 470, w: 300, h: 28 },
    { type: "coin", x: 1040, y: 510 },
    { type: "coin", x: 1410, y: 420 },
    { type: "hazard", x: 760, y: 640, w: 64, h: 40 },
    { type: "goal", x: 2200, y: 600, w: 52, h: 80 },
  ],
  goal: {
    type: "reach",
    target: 2200,
  },
  difficulty: "normal",
};
