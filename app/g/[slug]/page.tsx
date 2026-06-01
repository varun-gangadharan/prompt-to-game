// Owner: A4. Public, read-only play page. ?embed=1 strips the chrome so the
// page can be dropped into an <iframe>. Private games are never reachable here.

import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameCanvas } from "@/components/renderer/GameCanvas";
import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { gameSpecSchema } from "@/lib/spec/schema";
import type { GameSpec } from "@/lib/spec/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
};

type PublicGame = {
  title: string;
  spec: GameSpec;
  thumbnailUrl: string | null;
};

async function loadPublicGame(slug: string): Promise<PublicGame | null> {
  const [game] = await db
    .select({
      title: games.title,
      spec: games.spec,
      visibility: games.visibility,
      thumbnailUrl: games.thumbnailUrl,
    })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);

  if (!game || game.visibility === "private") {
    return null;
  }

  const parsed = gameSpecSchema.safeParse(game.spec);
  if (!parsed.success) {
    return null;
  }

  return { title: game.title, spec: parsed.data, thumbnailUrl: game.thumbnailUrl };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await loadPublicGame(slug);
  if (!game) {
    return { title: "Game not found" };
  }

  const ogImage = `/api/og/${encodeURIComponent(slug)}`;
  return {
    title: `${game.title} — Prompt to Game`,
    openGraph: {
      title: game.title,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      images: [ogImage],
    },
  };
}

export default async function PublicPlayPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const game = await loadPublicGame(slug);

  if (!game) {
    notFound();
  }

  // Best-effort play counter — never block rendering on it.
  db.update(games)
    .set({ playCount: sql`${games.playCount} + 1` })
    .where(eq(games.slug, slug))
    .catch((error) => console.error("play_count increment failed", error));

  const isEmbed = embed === "1";

  if (isEmbed) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <GameCanvas spec={game.spec} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <Link
              className="text-sm text-zinc-500 hover:text-zinc-300"
              href="/"
            >
              Prompt to Game
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {game.title}
            </h1>
          </div>
          <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300">
            {game.spec.template}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-5 sm:px-6">
        <GameCanvas spec={game.spec} />
        <p className="mt-4 text-sm text-zinc-500">
          Built with Prompt to Game.{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" href="/">
            Make your own →
          </Link>
        </p>
      </div>
    </main>
  );
}
