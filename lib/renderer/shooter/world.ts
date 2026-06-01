import type { ShooterGameSpec } from "@/lib/spec/types";

export type ShooterRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ShooterWorldModel = {
  width: number;
  height: number;
  playerSpeed: number;
  playerHealth: number;
  projectileSpeed: number;
  enemySpeed: number;
  spawnIntervalMs: number;
  scoreTarget: number;
  colors: {
    background: number;
    primary: number;
    accent: number;
    danger: number;
  };
  enemies: ShooterRect[];
  spawners: ShooterRect[];
  pickups: ShooterRect[];
};

const DEFAULT_ENTITY_SIZE = 34;
const DIFFICULTY_MULTIPLIER = {
  easy: 0.8,
  normal: 1,
  hard: 1.25,
} as const;

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function rectFromEntity(entity: { x: number; y: number; w?: number; h?: number }): ShooterRect {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.w ?? DEFAULT_ENTITY_SIZE,
    height: entity.h ?? DEFAULT_ENTITY_SIZE,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildShooterWorld(spec: ShooterGameSpec): ShooterWorldModel {
  const enemies: ShooterRect[] = [];
  const spawners: ShooterRect[] = [];
  const pickups: ShooterRect[] = [];

  for (const entity of spec.entities) {
    if (entity.type === "enemy") {
      enemies.push(rectFromEntity(entity));
    } else if (entity.type === "spawner") {
      spawners.push(rectFromEntity(entity));
    } else {
      pickups.push(rectFromEntity(entity));
    }
  }

  const scrollEquivalent = spec.world.scrollSpeed ?? spec.player.speed;
  const difficulty = DIFFICULTY_MULTIPLIER[spec.difficulty];

  return {
    width: spec.world.width,
    height: spec.world.height,
    playerSpeed: spec.player.speed * 48,
    playerHealth: spec.player.health,
    projectileSpeed: 520 + spec.player.speed * 18,
    enemySpeed: (72 + scrollEquivalent * 12) * difficulty,
    spawnIntervalMs: clamp(2200 - scrollEquivalent * 150, 550, 2400),
    scoreTarget: spec.goal.target,
    colors: {
      background: hexToNumber(spec.theme.palette[0]),
      primary: hexToNumber(spec.theme.palette[1]),
      accent: hexToNumber(spec.theme.palette[2]),
      danger: hexToNumber(spec.theme.palette[3]),
    },
    enemies,
    spawners,
    pickups,
  };
}
