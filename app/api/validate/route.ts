import { NextResponse } from "next/server";

import { withSentry } from "@/lib/observability/sentry";
import { gameSpecSchema, validateRequestSchema } from "@/lib/spec/schema";

async function handlePost(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedRequest = validateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json({
      ok: false,
      errors: parsedRequest.error.issues,
    });
  }

  const parsedSpec = gameSpecSchema.safeParse(parsedRequest.data.spec);

  if (!parsedSpec.success) {
    return NextResponse.json({
      ok: false,
      errors: parsedSpec.error.issues,
    });
  }

  return NextResponse.json({
    ok: true,
    spec: parsedSpec.data,
  });
}

export const POST = withSentry(handlePost);
