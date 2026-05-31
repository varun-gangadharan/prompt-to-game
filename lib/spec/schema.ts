// Owner: A3. Frozen at M0.
// This file is the single source of truth for GameSpec.
// Do NOT edit without coordinating with all agents.

import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color");

const themeSchema = z.object({
  palette: z.tuple([
    hexColorSchema,
    hexColorSchema,
    hexColorSchema,
    hexColorSchema,
  ]),
  spriteSet: z.enum(["blocks", "pixel", "neon"]),
  music: z.enum(["none", "chip-a", "chip-b"]),
});

const playerSchema = z.object({
  speed: z.number().min(1).max(10),
  jump: z.number().min(1).max(10).optional(),
  health: z.number().min(1).max(10),
});

const worldSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  gravity: z.number().positive().optional(),
  scrollSpeed: z.number().positive().optional(),
});

const goalSchema = z.object({
  type: z.enum(["reach", "score", "survive"]),
  target: z.number().nonnegative(),
});

const sizedPositionSchema = {
  x: z.number(),
  y: z.number(),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
};

const platformerEntitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("platform"), ...sizedPositionSchema }),
  z.object({ type: z.literal("coin"), ...sizedPositionSchema }),
  z.object({ type: z.literal("hazard"), ...sizedPositionSchema }),
  z.object({ type: z.literal("goal"), ...sizedPositionSchema }),
]);

const shooterEntitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("enemy"), ...sizedPositionSchema }),
  z.object({ type: z.literal("spawner"), ...sizedPositionSchema }),
  z.object({ type: z.literal("pickup"), ...sizedPositionSchema }),
]);

const runnerEntitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("obstacle-low"), ...sizedPositionSchema }),
  z.object({ type: z.literal("obstacle-high"), ...sizedPositionSchema }),
  z.object({ type: z.literal("pickup"), ...sizedPositionSchema }),
]);

const gameSpecBaseSchema = {
  version: z.literal("1"),
  id: z.string().uuid(),
  title: z.string().min(1).max(60),
  theme: themeSchema,
  player: playerSchema,
  world: worldSchema,
  goal: goalSchema,
  difficulty: z.enum(["easy", "normal", "hard"]),
};

export const platformerGameSpecSchema = z.object({
  ...gameSpecBaseSchema,
  template: z.literal("platformer"),
  entities: z.array(platformerEntitySchema),
});

export const shooterGameSpecSchema = z.object({
  ...gameSpecBaseSchema,
  template: z.literal("shooter"),
  entities: z.array(shooterEntitySchema),
});

export const runnerGameSpecSchema = z.object({
  ...gameSpecBaseSchema,
  template: z.literal("runner"),
  entities: z.array(runnerEntitySchema),
});

export const gameSpecSchema = z.discriminatedUnion("template", [
  platformerGameSpecSchema,
  shooterGameSpecSchema,
  runnerGameSpecSchema,
]);

export const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(500),
});

export const validateRequestSchema = z.object({
  spec: z.unknown(),
});
