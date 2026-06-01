// Owner: A4. POST /api/games — create a game (auth required).
// See docs/api.md. spec is always re-validated server-side before any write.

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser, unauthorizedResponse } from "@/lib/auth/requireUser";
import { db } from "@/lib/db/client";
import { games, type Visibility } from "@/lib/db/schema";
import { withSentry } from "@/lib/observability/sentry";
import { gameSpecSchema } from "@/lib/spec/schema";

export const runtime = "nodejs";

const createGameSchema = z.object({
  spec: gameSpecSchema,
  title: z.string().min(1).max(60).optional(),
  visibility: z.enum(["private", "unlisted", "public"]).optional(),
});

async function handlePost(request: Request) {
  try {
    const ownerId = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = createGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid game payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { spec, title, visibility } = parsed.data;

    const [row] = await db
      .insert(games)
      .values({
        ownerId,
        title: title ?? spec.title,
        template: spec.template,
        spec,
        visibility: (visibility ?? "private") as Visibility,
      })
      .returning({ id: games.id });

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;

    console.error("POST /api/games failed", error);
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}

export const POST = withSentry(handlePost);
