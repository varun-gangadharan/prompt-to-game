import type { PlatformerGameSpec } from "@/lib/spec/types";

export type PlatformerRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlatformerWorldModel = {
  width: number;
  height: number;
  gravity: number;
  playerSpeed: number;
  jumpVelocity: number;
  playerHealth: number;
  colors: {
    background: number;
    primary: number;
    accent: number;
    danger: number;
  };
  platforms: PlatformerRect[];
  coins: PlatformerRect[];
  hazards: PlatformerRect[];
  goals: PlatformerRect[];
  goalTarget: number;
};

const DEFAULT_ENTITY_SIZE = 32;

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function rectFromEntity(entity: { x: number; y: number; w?: number; h?: number }): PlatformerRect {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.w ?? DEFAULT_ENTITY_SIZE,
    height: entity.h ?? DEFAULT_ENTITY_SIZE,
  };
}

export function buildPlatformerWorld(spec: PlatformerGameSpec): PlatformerWorldModel {
  const platforms: PlatformerRect[] = [];
  const coins: PlatformerRect[] = [];
  const hazards: PlatformerRect[] = [];
  const goals: PlatformerRect[] = [];

  for (const entity of spec.entities) {
    if (entity.type === "platform") {
      platforms.push(rectFromEntity(entity));
    } else if (entity.type === "coin") {
      coins.push(rectFromEntity(entity));
    } else if (entity.type === "hazard") {
      hazards.push(rectFromEntity(entity));
    } else {
      goals.push(rectFromEntity(entity));
    }
  }

  return {
    width: spec.world.width,
    height: spec.world.height,
    gravity: (spec.world.gravity ?? 8) * 90,
    playerSpeed: spec.player.speed * 45,
    jumpVelocity: -(spec.player.jump ?? 6) * 55,
    playerHealth: spec.player.health,
    colors: {
      background: hexToNumber(spec.theme.palette[0]),
      primary: hexToNumber(spec.theme.palette[1]),
      accent: hexToNumber(spec.theme.palette[2]),
      danger: hexToNumber(spec.theme.palette[3]),
    },
    platforms,
    coins,
    hazards,
    goals,
    goalTarget: spec.goal.target,
  };
}
