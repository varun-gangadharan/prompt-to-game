import { getGoogleGenAIClient } from "./client";
import { responseSchema } from "./responseSchema";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { gameSpecSchema } from "../spec/schema";
import type { GameSpec } from "../spec/types";

export class UnrepairableGameSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnrepairableGameSpecError";
  }
}

const model = () => process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenced?.[1] ?? trimmed;

  return JSON.parse(jsonText) as unknown;
}

async function requestSpec(contents: string) {
  const ai = getGoogleGenAIClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: model(),
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7,
        },
      });

      if (!response.text) {
        throw new UnrepairableGameSpecError("Gemini returned an empty response");
      }

      return response.text;
    } catch (error) {
      lastError = error;

      if (error instanceof UnrepairableGameSpecError || attempt === 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

function validateResponse(text: string): GameSpec {
  let json: unknown;

  try {
    json = parseJsonObject(text);
  } catch (error) {
    throw new UnrepairableGameSpecError(
      `Gemini returned invalid JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }

  const parsed = gameSpecSchema.safeParse(json);

  if (!parsed.success) {
    throw new UnrepairableGameSpecError(parsed.error.message);
  }

  return parsed.data;
}

export async function generateSpec(prompt: string): Promise<{
  spec: GameSpec;
  latencyMs: number;
  repaired: boolean;
}> {
  const startedAt = Date.now();
  const firstResponse = await requestSpec(prompt);

  try {
    return {
      spec: validateResponse(firstResponse),
      latencyMs: Date.now() - startedAt,
      repaired: false,
    };
  } catch (error) {
    const validationError =
      error instanceof Error ? error.message : "Unknown validation error";

    const repairPrompt = `The previous response for this prompt did not validate.

Original user prompt:
${prompt}

Validation error:
${validationError}

Return one corrected JSON object that satisfies the GameSpec contract.`;

    const repairedResponse = await requestSpec(repairPrompt);

    try {
      return {
        spec: validateResponse(repairedResponse),
        latencyMs: Date.now() - startedAt,
        repaired: true,
      };
    } catch (repairError) {
      const repairMessage =
        repairError instanceof Error
          ? repairError.message
          : "Unknown repair validation error";

      throw new UnrepairableGameSpecError(
        `Gemini response did not validate after repair: ${repairMessage}`,
      );
    }
  }
}
