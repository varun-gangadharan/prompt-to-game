import type { RunnerGameSpec } from "@/lib/spec/types";

export type RunnerRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "obstacle-low" | "obstacle-high" | "pickup";
};

export type RunnerWorldModel = {
  width: number;
  height: number;
  gravity: number;
  scrollSpeed: number;
  jumpVelocity: number;
  playerHealth: number;
  scoreTarget: number;
  groundY: number;
  canDuck: boolean;
  colors: {
    background: number;
    primary: number;
    accent: number;
    danger: number;
  };
  stream: RunnerRect[];
};

const DEFAULT_ENTITY_SIZE = 36;
const DIFFICULTY_MULTIPLIER = {
  easy: 0.85,
  normal: 1,
  hard: 1.18,
} as const;

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function rectFromEntity(entity: RunnerGameSpec["entities"][number]): RunnerRect {
  return {
    type: entity.type,
    x: entity.x,
    y: entity.y,
    width: entity.w ?? DEFAULT_ENTITY_SIZE,
    height: entity.h ?? DEFAULT_ENTITY_SIZE,
  };
}

export function buildRunnerWorld(spec: RunnerGameSpec): RunnerWorldModel {
  const groundY = spec.world.height - 54;
  const scrollSpeed = (spec.world.scrollSpeed ?? spec.player.speed) * 58 *
    DIFFICULTY_MULTIPLIER[spec.difficulty];

  return {
    width: spec.world.width,
    height: spec.world.height,
    gravity: (spec.world.gravity ?? 8) * 95,
    scrollSpeed,
    jumpVelocity: -(spec.player.jump ?? 6) * 58,
    playerHealth: spec.player.health,
    scoreTarget: spec.goal.target,
    groundY,
    canDuck: spec.player.jump !== undefined,
    colors: {
      background: hexToNumber(spec.theme.palette[0]),
      primary: hexToNumber(spec.theme.palette[1]),
      accent: hexToNumber(spec.theme.palette[2]),
      danger: hexToNumber(spec.theme.palette[3]),
    },
    stream: spec.entities.map(rectFromEntity),
  };
}
