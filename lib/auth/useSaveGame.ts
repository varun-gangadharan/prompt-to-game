// Owner: A4. Save/publish hook for the editor to call.
// Encapsulates the create → patch → publish API dance plus client-side
// thumbnail capture, so EditorShell only needs save()/publish() + status.

"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";

import { clerkEnabled } from "@/lib/auth/clerkEnabled";
import { captureThumbnail } from "@/lib/thumbnail/capture";
import type { GameSpec } from "@/lib/spec/types";

// Read sign-in state only when Clerk is configured. `clerkEnabled` is a
// build-time constant, so this branch is stable for the lifetime of the app
// and the rules-of-hooks order never changes between renders.
function useOptionalIsSignedIn(): boolean {
  if (!clerkEnabled) {
    return false;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth().isSignedIn ?? false;
}

type Status =
  | "idle"
  | "saving"
  | "publishing"
  | "saved"
  | "published"
  | "error";

export type SaveGameState = {
  gameId: string | null;
  slug: string | null;
  thumbnailUrl: string | null;
  status: Status;
  error: string | null;
};

type SaveOptions = {
  title?: string;
  visibility?: "private" | "unlisted" | "public";
};

const INITIAL: SaveGameState = {
  gameId: null,
  slug: null,
  thumbnailUrl: null,
  status: "idle",
  error: null,
};

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  return data?.error ?? fallback;
}

export function useSaveGame(initialGameId: string | null = null) {
  const isSignedIn = useOptionalIsSignedIn();
  const [state, setState] = useState<SaveGameState>({
    ...INITIAL,
    gameId: initialGameId,
  });

  // Create on first call, PATCH afterwards. Returns the game id, or null on
  // failure (state.error is populated).
  const save = useCallback(
    async (spec: GameSpec, options: SaveOptions = {}): Promise<string | null> => {
      setState((prev) => ({ ...prev, status: "saving", error: null }));

      try {
        const existingId = state.gameId ?? initialGameId;
        const response = existingId
          ? await fetch(`/api/games/${existingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spec, ...options }),
            })
          : await fetch("/api/games", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spec, ...options }),
            });

        if (!response.ok) {
          throw new Error(await readError(response, "Failed to save game."));
        }

        const gameId = existingId
          ? existingId
          : ((await response.json()) as { id: string }).id;

        setState((prev) => ({ ...prev, gameId, status: "saved", error: null }));
        return gameId;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : "Failed to save game.",
        }));
        return null;
      }
    },
    [initialGameId, state.gameId],
  );

  // Ensure the game is saved, capture a thumbnail (best-effort), then publish.
  const publish = useCallback(
    async (spec: GameSpec): Promise<{ slug: string; thumbnailUrl: string | null } | null> => {
      const gameId = (await save(spec)) ?? null;
      if (!gameId) {
        return null;
      }

      setState((prev) => ({ ...prev, status: "publishing", error: null }));

      try {
        const form = new FormData();
        try {
          const thumbnail = await captureThumbnail(spec);
          if (thumbnail) {
            form.append("thumbnail", thumbnail, "thumbnail.png");
          }
        } catch (captureError) {
          // Thumbnail is optional — log and publish without it.
          console.warn("Thumbnail capture failed", captureError);
        }

        const response = await fetch(`/api/games/${gameId}/publish`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          throw new Error(await readError(response, "Failed to publish game."));
        }

        const result = (await response.json()) as {
          slug: string;
          thumbnailUrl: string | null;
        };

        setState((prev) => ({
          ...prev,
          slug: result.slug,
          thumbnailUrl: result.thumbnailUrl,
          status: "published",
          error: null,
        }));
        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            error instanceof Error ? error.message : "Failed to publish game.",
        }));
        return null;
      }
    },
    [save],
  );

  return { ...state, isSignedIn: isSignedIn ?? false, save, publish };
}
