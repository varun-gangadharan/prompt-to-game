// Owner: A4. Clerk auth middleware.
// Protects the /me page and every non-GET (write) request under /api/games.
// GET /api/games/[id] stays public so unlisted/public games can be read
// without a session; the route handler still enforces per-game visibility.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { clerkEnabled } from "@/lib/auth/clerkEnabled";

const isProtectedPage = createRouteMatcher(["/me(.*)"]);
const isGamesApi = createRouteMatcher(["/api/games", "/api/games/(.*)"]);

const withClerk = clerkMiddleware(async (auth, req) => {
  const isWriteApi = isGamesApi(req) && req.method !== "GET";

  if (isProtectedPage(req) || isWriteApi) {
    await auth.protect();
  }
});

// Clerk is optional. Without keys, clerkMiddleware throws on every request, so
// fall through to a no-op — auth-required routes still enforce auth themselves
// (requireUser returns 401 when Clerk is disabled).
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!clerkEnabled) {
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
