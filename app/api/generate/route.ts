import { NextResponse } from "next/server";

import {
  generateSpec,
  UnrepairableGameSpecError,
} from "../../../lib/llm/generateSpec";
import { generateRequestSchema } from "../../../lib/spec/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedRequest = generateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid prompt" },
      { status: 400 },
    );
  }

  const { prompt } = parsedRequest.data;

  try {
    const { spec, latencyMs, repaired } = await generateSpec(prompt);

    console.log({
      prompt,
      template: spec.template,
      status: "ok",
      latencyMs,
      repaired,
    });

    return NextResponse.json({ spec });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate spec";

    const status = error instanceof UnrepairableGameSpecError ? 422 : 500;

    console.log({
      prompt,
      status: "error",
      latencyMs: 0,
      repaired: false,
      error: message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}
