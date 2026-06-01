// Owner: A4. Server-side auth helper for route handlers.
// Throws UnauthorizedError when there is no Clerk session; routes translate
// that into a 401. Middleware already guards write routes, but handlers call
// this too so auth is enforced even if the matcher ever drifts.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

/** Returns the current user id or null without throwing. */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/** Maps thrown auth errors to a JSON response; rethrows anything else. */
export function unauthorizedResponse(error: unknown): NextResponse | null {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}
