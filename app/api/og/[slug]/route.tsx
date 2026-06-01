// Owner: A4. GET /api/og/[slug] — 1200x630 social card for a published game.
// Uses the stored thumbnail as the backdrop when present, otherwise renders a
// themed gradient from the game's palette.

import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { gameSpecSchema } from "@/lib/spec/schema";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const [game] = await db
    .select({
      title: games.title,
      template: games.template,
      visibility: games.visibility,
      thumbnailUrl: games.thumbnailUrl,
      spec: games.spec,
    })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);

  const isPublic = game && game.visibility !== "private";
  const parsed = isPublic ? gameSpecSchema.safeParse(game.spec) : null;
  const palette = parsed?.success
    ? parsed.data.theme.palette
    : (["#09090b", "#22d3ee", "#a78bfa", "#f43f5e"] as const);

  const title = isPublic ? game.title : "Prompt to Game";
  const template = isPublic ? game.template : "play";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {isPublic && game.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={game.thumbnailUrl}
            width={WIDTH}
            height={HEIGHT}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 64,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: palette[2],
              fontSize: 28,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            <span>Prompt to Game</span>
            <span style={{ color: "#a1a1aa" }}>· {template}</span>
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
