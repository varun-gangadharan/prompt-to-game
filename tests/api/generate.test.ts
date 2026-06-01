import { describe, expect, it } from "vitest";

import { gameSpecSchema } from "../../lib/spec/schema";

// Imported lazily inside the (gated) test so merely collecting this file never
// pulls in the route — and its eager DB client — when the suite is skipped.
type GeneratePost = (request: Request) => Promise<Response>;

const prompts = [
  "Make a cozy platformer about a toast hero collecting jam jars.",
  "A hard neon shooter where the player survives waves of drones.",
  "An easy runner through a rainy skyline with pickups and low barriers.",
  "A cave platform game with hazards, coins, and a glowing exit.",
  "Top down arcade shooter with spawners, enemies, and health pickups.",
  "Fast runner on desert rooftops where the goal is to survive 120 seconds.",
  "Kid friendly platformer about jumping across clouds to reach a flag.",
  "Cyberpunk shooter focused on scoring 3000 points.",
  "Forest runner with high and low obstacles and a chip tune soundtrack.",
  "Tiny knight platformer with normal difficulty and lava traps.",
  "Space arena shooter with neon colors and several enemies.",
  "Blocks style runner where a robot jumps over crates.",
  "Ice mountain platformer with slippery platforms and gems.",
  "Arcade shooter about defending a reactor from swarms.",
  "Runner through a subway tunnel with pickups and hard difficulty.",
  "Platformer where a frog reaches a pond after collecting flies.",
  "Shooter with pickups and a survive objective instead of score.",
  "Easy runner for beginners with bright colors and gentle scroll speed.",
  "Hard platformer with long gaps, hazards, and a far goal.",
  "Normal difficulty shooter using pixel art and chip-a music.",
];

async function postGenerate(POST: GeneratePost, prompt: string) {
  let lastResponse: Response | null = null;
  let lastBody: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    lastResponse = await POST(request);
    lastBody = await lastResponse.json();

    if (lastResponse.status === 200) {
      return { response: lastResponse, body: lastBody };
    }
  }

  return { response: lastResponse, body: lastBody };
}

describe.skipIf(!process.env.GEMINI_API_KEY)("POST /api/generate", () => {
  it(
    "returns valid GameSpecs for a 20-prompt smoke set",
    async () => {
      const { POST } = (await import("../../app/api/generate/route")) as {
        POST: GeneratePost;
      };

      for (const prompt of prompts) {
        const { response, body } = await postGenerate(POST, prompt);

        expect(response?.status).toBe(200);
        const result = gameSpecSchema.safeParse(
          (body as { spec?: unknown }).spec,
        );

        expect(
          result.success,
          result.success ? undefined : result.error.message,
        ).toBe(true);
      }
    },
    900_000,
  );
});
