import { NextResponse } from "next/server";

import { platformerExample } from "@/lib/spec/examples";
import { generateRequestSchema, gameSpecSchema } from "@/lib/spec/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedRequest = generateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid prompt" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    spec: gameSpecSchema.parse(platformerExample),
  });
}
