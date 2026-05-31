import { NextResponse } from "next/server";

import { gameSpecSchema, validateRequestSchema } from "@/lib/spec/schema";

export async function POST(request: Request) {
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
