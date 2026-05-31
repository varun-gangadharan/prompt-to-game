import type { RunnerGameSpec } from "../types";

export const runnerExample: RunnerGameSpec = {
  version: "1",
  id: "33333333-3333-4333-8333-333333333333",
  title: "Skyline Sprint",
  template: "runner",
  theme: {
    palette: ["#f7f7ff", "#2f3a8f", "#f7b801", "#f35b04"],
    spriteSet: "blocks",
    music: "chip-a",
  },
  player: {
    speed: 6,
    jump: 6,
    health: 3,
  },
  world: {
    width: 1600,
    height: 600,
    gravity: 8,
    scrollSpeed: 5,
  },
  entities: [
    { type: "obstacle-low", x: 520, y: 540, w: 60, h: 40 },
    { type: "obstacle-high", x: 880, y: 420, w: 70, h: 80 },
    { type: "pickup", x: 1180, y: 360, w: 28, h: 28 },
  ],
  goal: {
    type: "survive",
    target: 90,
  },
  difficulty: "easy",
};
