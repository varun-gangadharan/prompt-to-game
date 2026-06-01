// Lightweight in-memory fixed-window rate limiter for /api/generate.
//
// This guards against casual abuse / runaway LLM cost. It is per-instance
// (not shared across serverless instances), so it is a floor, not a ceiling —
// swap in a shared store (e.g. Upstash Redis / Vercel KV) for a hard global
// limit. The route path is fixed by the App Router file, so path-casing and
// trailing-slash variants all resolve to the same handler and cannot bypass it.

type Window = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    retryAfterSeconds: 0,
  };
}

// Best-effort client identity from proxy headers (Vercel sets x-forwarded-for).
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
