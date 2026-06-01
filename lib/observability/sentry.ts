// Lightweight observability shim for API route handlers.
//
// It intentionally does NOT pull in @sentry/* as a hard dependency. When a DSN
// is configured the hooks can be re-pointed at the real SDK; until then every
// call is a no-op besides a structured console fallback so errors stay visible
// in dev and platform logs.
//
// `withSentry` wraps a Next.js route handler so thrown errors are captured and
// then re-thrown unchanged. It never alters the handler's arguments or its
// response — it is a transparent cross-cutting wrapper, not request logic.

type SentryState = {
  enabled: boolean;
  dsn: string | null;
  initialized: boolean;
};

const state: SentryState = { enabled: false, dsn: null, initialized: false };

/** Reads the DSN once and records whether reporting is active. Idempotent. */
export function initSentry(): SentryState {
  if (state.initialized) {
    return state;
  }

  const dsn =
    process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? null;

  state.dsn = dsn;
  state.enabled = Boolean(dsn);
  state.initialized = true;

  return state;
}

export function isSentryEnabled(): boolean {
  if (!state.initialized) {
    initSentry();
  }
  return state.enabled;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!state.initialized) {
    initSentry();
  }

  if (!state.enabled) {
    // No DSN: degrade to a structured console log rather than swallow the error.
    console.error("[sentry:noop] captureException", error, context ?? {});
    return;
  }

  // DSN present but the SDK is not wired up yet — surface enough to debug
  // without making @sentry/* a build-time requirement.
  console.error("[sentry] captureException", {
    dsn: state.dsn,
    error,
    context: context ?? {},
  });
}

type RouteHandler<Args extends unknown[]> = (
  ...args: Args
) => Response | Promise<Response>;

/**
 * Wrap a route handler so unhandled errors are reported and re-thrown. The
 * returned function preserves the handler's arguments and resolved Response.
 */
export function withSentry<Args extends unknown[]>(
  handler: RouteHandler<Args>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    initSentry();
    try {
      return await handler(...args);
    } catch (error) {
      captureException(error, { handler: handler.name || "anonymous" });
      throw error;
    }
  };
}
