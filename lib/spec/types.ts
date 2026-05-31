import type { z } from "zod";

import type {
  gameSpecSchema,
  platformerGameSpecSchema,
  runnerGameSpecSchema,
  shooterGameSpecSchema,
} from "./schema";

export type GameSpec = z.infer<typeof gameSpecSchema>;
export type PlatformerGameSpec = z.infer<typeof platformerGameSpecSchema>;
export type ShooterGameSpec = z.infer<typeof shooterGameSpecSchema>;
export type RunnerGameSpec = z.infer<typeof runnerGameSpecSchema>;
export type GameTemplate = GameSpec["template"];
export type GameEntity = GameSpec["entities"][number];
