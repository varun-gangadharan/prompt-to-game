// Owner: A4. Fire-and-forget LLM call log (powers eval + iteration, PLAN §5).
// Never throws — logging must not break the generate path.

import type { GameSpec } from "@/lib/spec/types";

import { db } from "./client";
import { generations, type GenerationStatus } from "./schema";

export async function logGeneration(entry: {
  userId?: string | null;
  prompt: string;
  spec?: GameSpec | null;
  status: GenerationStatus;
  latencyMs?: number | null;
}): Promise<void> {
  try {
    await db.insert(generations).values({
      userId: entry.userId ?? null,
      prompt: entry.prompt,
      spec: entry.spec ?? null,
      status: entry.status,
      latencyMs: entry.latencyMs ?? null,
    });
  } catch (error) {
    console.error("logGeneration failed", error);
  }
}
