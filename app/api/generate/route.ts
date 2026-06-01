import { NextResponse } from "next/server";

import { getUserId } from "../../../lib/auth/requireUser"; // A4
import { logGeneration } from "../../../lib/db/logGeneration"; // A4
import {
  generateSpec,
  UnrepairableGameSpecError,
} from "../../../lib/llm/generateSpec";
import { clientKey, rateLimit } from "../../../lib/llm/rateLimit";
import { generateRequestSchema } from "../../../lib/spec/schema";
import { withSentry } from "../../../lib/observability/sentry";

async function handlePost(request: Request) {
  const limit = rateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedRequest = generateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid prompt" },
      { status: 400 },
    );
  }

  const { prompt } = parsedRequest.data;
  const userId = await getUserId(); // A4

  try {
    const { spec, latencyMs, repaired } = await generateSpec(prompt);
    void logGeneration({ userId, prompt, spec, status: "ok", latencyMs }); // A4

    // Log shape/metrics only — never the raw prompt (may contain PII).
    console.log({
      promptLength: prompt.length,
      template: spec.template,
      status: "ok",
      latencyMs,
      repaired,
    });

    // `x-spec-repaired` is additive diagnostics (the JSON body is unchanged):
    // it lets the eval harness measure repair rate from the HTTP boundary.
    return NextResponse.json(
      { spec },
      { headers: { "x-spec-repaired": String(repaired) } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate spec";

    const status = error instanceof UnrepairableGameSpecError ? 422 : 500;
    void logGeneration({
      userId,
      prompt,
      status: error instanceof UnrepairableGameSpecError ? "invalid" : "error",
    }); // A4

    console.log({
      promptLength: prompt.length,
      status: "error",
      latencyMs: 0,
      repaired: false,
      error: message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}

export const POST = withSentry(handlePost);
