// Owner: A4. GET (public unless private) + PATCH (owner-only) for one game.

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getUserId,
  requireUser,
  unauthorizedResponse,
} from "@/lib/auth/requireUser";
import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { gameSpecSchema } from "@/lib/spec/schema";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

const patchGameSchema = z
  .object({
    spec: gameSpecSchema.optional(),
    title: z.string().min(1).max(60).optional(),
    visibility: z.enum(["private", "unlisted", "public"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  if (!game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Private games are only readable by their owner.
  if (game.visibility === "private") {
    const userId = await getUserId();
    if (userId !== game.ownerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    id: game.id,
    title: game.title,
    template: game.template,
    spec: game.spec,
    visibility: game.visibility,
    slug: game.slug,
    thumbnailUrl: game.thumbnailUrl,
    createdAt: game.createdAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await requireUser();

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = patchGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select({ ownerId: games.ownerId })
      .from(games)
      .where(eq(games.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { spec, title, visibility } = parsed.data;
    await db
      .update(games)
      .set({
        ...(spec ? { spec, template: spec.template } : {}),
        ...(title ? { title } : {}),
        ...(visibility ? { visibility } : {}),
        updatedAt: new Date(),
      })
      .where(eq(games.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;

    console.error("PATCH /api/games/[id] failed", error);
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}
