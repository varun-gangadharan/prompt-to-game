// Owner: A4. Authenticated list of the current user's saved games, paginated.
// Middleware guards this route; we still resolve the userId here defensively.

import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { desc, eq, sql } from "drizzle-orm";
import type { Route } from "next";
import Link from "next/link";

import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function MyGamesPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  const { page: pageParam } = await searchParams;

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p className="text-sm text-zinc-400">Sign in to see your games.</p>
      </main>
    );
  }

  const page = parsePage(pageParam);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: games.id,
        title: games.title,
        template: games.template,
        visibility: games.visibility,
        slug: games.slug,
        thumbnailUrl: games.thumbnailUrl,
        updatedAt: games.updatedAt,
      })
      .from(games)
      .where(eq(games.ownerId, userId))
      .orderBy(desc(games.updatedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(eq(games.ownerId, userId)),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <Link className="text-sm text-zinc-500 hover:text-zinc-300" href="/">
              Prompt to Game
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-white">Your games</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex h-9 items-center rounded-md bg-cyan-300 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200"
              href="/"
            >
              New game
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            No saved games yet. Generate one from the{" "}
            <Link className="text-cyan-300 hover:text-cyan-200" href="/">
              home page
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((game) => (
              <li
                key={game.id}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
              >
                <div className="aspect-[1200/630] bg-zinc-950">
                  {game.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${game.title} thumbnail`}
                      className="h-full w-full object-cover"
                      src={game.thumbnailUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                      No thumbnail
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold text-white">
                      {game.title}
                    </h2>
                    <span className="shrink-0 rounded border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
                      {game.template}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{game.visibility}</span>
                    {game.slug ? (
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        href={`/g/${game.slug}` as Route}
                      >
                        Play →
                      </Link>
                    ) : (
                      <span className="text-zinc-600">Not published</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-700"
                href={`/me?page=${page - 1}` as Route}
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-zinc-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-700"
                href={`/me?page=${page + 1}` as Route}
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
