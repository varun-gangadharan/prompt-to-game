import { Type } from "@google/genai";

const hexColorSchema = {
  type: Type.STRING,
  pattern: "^#[0-9a-fA-F]{6}$",
};

const entitySchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: [
        "platform",
        "coin",
        "hazard",
        "goal",
        "enemy",
        "spawner",
        "pickup",
        "obstacle-low",
        "obstacle-high",
      ],
    },
    x: { type: Type.NUMBER },
    y: { type: Type.NUMBER },
    w: { type: Type.NUMBER },
    h: { type: Type.NUMBER },
  },
  required: ["type", "x", "y"],
};

export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.STRING, enum: ["1"] },
    id: {
      type: Type.STRING,
      format: "uuid",
    },
    title: {
      type: Type.STRING,
      minLength: 1,
      maxLength: 60,
    },
    template: {
      type: Type.STRING,
      enum: ["platformer", "shooter", "runner"],
    },
    theme: {
      type: Type.OBJECT,
      properties: {
        palette: {
          type: Type.ARRAY,
          items: hexColorSchema,
          minItems: 4,
          maxItems: 4,
        },
        spriteSet: {
          type: Type.STRING,
          enum: ["blocks", "pixel", "neon"],
        },
        music: {
          type: Type.STRING,
          enum: ["none", "chip-a", "chip-b"],
        },
      },
      required: ["palette", "spriteSet", "music"],
    },
    player: {
      type: Type.OBJECT,
      properties: {
        speed: { type: Type.NUMBER, minimum: 1, maximum: 10 },
        jump: { type: Type.NUMBER, minimum: 1, maximum: 10 },
        health: { type: Type.NUMBER, minimum: 1, maximum: 10 },
      },
      required: ["speed", "health"],
    },
    world: {
      type: Type.OBJECT,
      properties: {
        width: { type: Type.NUMBER, minimum: 1 },
        height: { type: Type.NUMBER, minimum: 1 },
        gravity: { type: Type.NUMBER, minimum: 1 },
        scrollSpeed: { type: Type.NUMBER, minimum: 1 },
      },
      required: ["width", "height"],
    },
    entities: {
      type: Type.ARRAY,
      items: entitySchema,
    },
    goal: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ["reach", "score", "survive"],
        },
        target: {
          type: Type.NUMBER,
          minimum: 0,
        },
      },
      required: ["type", "target"],
    },
    difficulty: {
      type: Type.STRING,
      enum: ["easy", "normal", "hard"],
    },
  },
  required: [
    "version",
    "id",
    "title",
    "template",
    "theme",
    "player",
    "world",
    "entities",
    "goal",
    "difficulty",
  ],
};

