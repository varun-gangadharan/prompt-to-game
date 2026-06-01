// Owner: A4. POST /api/games/[id]/publish — owner-only.
// Mints a stable share slug, makes the game public, and (best-effort) stores a
// thumbnail. The client may send the captured PNG as multipart form-data under
// the "thumbnail" field; if BLOB_READ_WRITE_TOKEN is missing the upload is
// skipped and thumbnailUrl comes back null rather than failing the publish.

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser, unauthorizedResponse } from "@/lib/auth/requireUser";
import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { mintSlugCandidate } from "@/lib/db/slug";
import { uploadThumbnail } from "@/lib/thumbnail/capture";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

async function ensureUniqueSlug(
  existingSlug: string | null,
  title: string,
): Promise<string> {
  if (existingSlug) return existingSlug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = mintSlugCandidate(title);
    const [clash] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
  }
  throw new Error("Could not mint a unique slug after several attempts.");
}

async function readThumbnail(request: Request): Promise<ArrayBuffer | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return null;
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("thumbnail");
  if (!file || typeof file === "string") {
    return null;
  }
  return file.arrayBuffer();
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await requireUser();

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [game] = await db
      .select({
        ownerId: games.ownerId,
        slug: games.slug,
        title: games.title,
      })
      .from(games)
      .where(eq(games.id, id))
      .limit(1);

    if (!game) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (game.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slug = await ensureUniqueSlug(game.slug, game.title);

    const thumbBytes = await readThumbnail(request);
    const thumbnailUrl = thumbBytes
      ? await uploadThumbnail(id, thumbBytes)
      : null;

    await db
      .update(games)
      .set({
        slug,
        visibility: "public",
        // Keep an existing thumbnail if this publish didn't supply a new one.
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(games.id, id));

    return NextResponse.json({ slug, thumbnailUrl });
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;

    console.error("POST /api/games/[id]/publish failed", error);
    return NextResponse.json({ error: "Failed to publish game" }, { status: 500 });
  }
}
