// Owner: A4. Drizzle table definitions. Mirrors PLAN.md §5.
// `spec` always holds a GameSpec validated server-side with gameSpecSchema
// before any write — the column type is intentionally loose jsonb.

import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { GameSpec } from "@/lib/spec/types";

export type Visibility = "private" | "unlisted" | "public";
export type GenerationStatus = "ok" | "invalid" | "error";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  template: text("template").notNull(),
  spec: jsonb("spec").$type<GameSpec>().notNull(),
  visibility: text("visibility").$type<Visibility>().notNull().default("private"),
  slug: text("slug").unique(),
  thumbnailUrl: text("thumbnail_url"),
  playCount: integer("play_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  prompt: text("prompt").notNull(),
  spec: jsonb("spec").$type<GameSpec | null>(),
  status: text("status").$type<GenerationStatus>().notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GameRow = typeof games.$inferSelect;
export type NewGameRow = typeof games.$inferInsert;
export type GenerationRow = typeof generations.$inferSelect;
export type NewGenerationRow = typeof generations.$inferInsert;

// Exported for callers that want the DB-side default without hardcoding it.
export const playCountIncrement = sql`${games.playCount} + 1`;
