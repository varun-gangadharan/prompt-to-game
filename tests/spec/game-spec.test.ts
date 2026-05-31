import { describe, expect, it } from "vitest";

import {
  platformerExample,
  runnerExample,
  shooterExample,
} from "../../lib/spec/examples";
import { gameSpecSchema } from "../../lib/spec/schema";

const examples = [
  ["platformer", platformerExample],
  ["shooter", shooterExample],
  ["runner", runnerExample],
] as const;

describe("GameSpec examples", () => {
  it.each(examples)("validates the %s example", (_template, spec) => {
    expect(gameSpecSchema.safeParse(spec).success).toBe(true);
  });

  it("rejects entity variants from the wrong template", () => {
    const result = gameSpecSchema.safeParse({
      ...platformerExample,
      entities: [{ type: "enemy", x: 10, y: 20 }],
    });

    expect(result.success).toBe(false);
  });
});
