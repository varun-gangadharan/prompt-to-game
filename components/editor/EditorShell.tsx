"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { GameCanvas } from "@/components/editor/GameCanvas";
import { ParamsPanel } from "@/components/editor/ParamsPanel";
import { usePromptStore } from "@/components/editor/usePromptStore";
import { clerkEnabled } from "@/lib/auth/clerkEnabled";
import { useSaveGame } from "@/lib/auth/useSaveGame";
import { gameSpecSchema } from "@/lib/spec/schema";
import type { GameSpec } from "@/lib/spec/types";

const SPEC_STORAGE_PREFIX = "prompt-to-game:spec:";

type GenerateResponse = { spec: GameSpec } | { error: string };

export function EditorShell() {
  const searchParams = useSearchParams();
  const specId = searchParams.get("id");
  const [spec, setSpec] = useState<GameSpec | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSpecValid, setIsSpecValid] = useState(true);

  const prompt = usePromptStore((state) => state.prompt);
  const setPrompt = usePromptStore((state) => state.setPrompt);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const {
    save,
    publish,
    status: saveStatus,
    error: saveError,
    slug,
    isSignedIn,
  } = useSaveGame();
  const isBusy = saveStatus === "saving" || saveStatus === "publishing";
  const shareUrl = slug ? (`/g/${slug}` as Route) : null;

  useEffect(() => {
    if (!specId) {
      setLoadError("No generated spec id was provided.");
      return;
    }

    const storedSpec = window.sessionStorage.getItem(
      `${SPEC_STORAGE_PREFIX}${specId}`,
    );
    if (!storedSpec) {
      setLoadError("No generated spec was found for this editor session.");
      return;
    }

    try {
      const parsed = gameSpecSchema.safeParse(JSON.parse(storedSpec));
      if (!parsed.success) {
        setLoadError("The generated spec is not valid.");
        return;
      }
      setSpec(parsed.data);
      setLoadError(null);
    } catch {
      setLoadError("The generated spec could not be read.");
    }
  }, [specId]);

  useEffect(() => {
    if (!spec) {
      return;
    }

    window.sessionStorage.setItem(
      `${SPEC_STORAGE_PREFIX}${spec.id}`,
      JSON.stringify(spec),
    );
  }, [spec]);

  // Seed the regenerate prompt from the spec title the first time a spec
  // loads without a persisted prompt. The store keeps it across reloads.
  useEffect(() => {
    if (spec && !prompt) {
      setPrompt(spec.title);
    }
  }, [spec, prompt, setPrompt]);

  const handleRegenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setRegenerateError("Enter a prompt to regenerate.");
      return;
    }

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !("spec" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Regeneration failed.",
        );
      }

      const parsed = gameSpecSchema.safeParse(payload.spec);
      if (!parsed.success) {
        throw new Error("Regenerated spec was invalid.");
      }

      // Persist under both the new spec id and the current route id so a
      // reload of this editor URL returns the regenerated spec.
      window.sessionStorage.setItem(
        `${SPEC_STORAGE_PREFIX}${parsed.data.id}`,
        JSON.stringify(parsed.data),
      );
      if (specId) {
        window.sessionStorage.setItem(
          `${SPEC_STORAGE_PREFIX}${specId}`,
          JSON.stringify(parsed.data),
        );
      }

      setSpec(parsed.data);
    } catch (error) {
      setRegenerateError(
        error instanceof Error ? error.message : "Regeneration failed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [prompt, specId]);

  if (!spec) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-xl font-semibold text-white">Editor</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {loadError ?? "Loading generated spec..."}
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-zinc-950"
            href="/"
          >
            Generate a spec
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="text-sm text-zinc-500 hover:text-zinc-300" href="/">
              Prompt to Game
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {spec.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300">
              {spec.template}
            </span>
            <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300">
              {spec.difficulty}
            </span>
            <span
              className={
                isSpecValid
                  ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200"
                  : "rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200"
              }
            >
              {isSpecValid ? "Valid spec" : "Needs edits"}
            </span>

            {/* Auth UI only renders when Clerk is configured; the Clerk
                components require a provider. Without it, save/publish are
                hidden (the APIs would return 401 anyway). */}
            {clerkEnabled ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className="inline-flex h-9 items-center rounded-md bg-cyan-300 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200"
                      type="button"
                    >
                      Sign in to save
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <button
                    className="inline-flex h-9 items-center rounded-md border border-zinc-700 px-3 text-sm font-medium text-zinc-100 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy || !isSpecValid}
                    onClick={() => void save(spec)}
                    type="button"
                  >
                    {saveStatus === "saving" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="inline-flex h-9 items-center rounded-md bg-cyan-300 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy || !isSpecValid}
                    onClick={() => void publish(spec)}
                    type="button"
                  >
                    {saveStatus === "publishing" ? "Publishing..." : "Publish"}
                  </button>
                </SignedIn>
              </>
            ) : (
              <span className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
                Sign-in not configured
              </span>
            )}
          </div>
        </div>

        {(shareUrl || saveError || saveStatus === "saved") && (
          <div className="mx-auto mt-3 max-w-7xl text-sm">
            {saveError ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
                {saveError}
              </p>
            ) : shareUrl ? (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                Published — share at{" "}
                <Link className="font-semibold underline" href={shareUrl}>
                  {shareUrl}
                </Link>
              </p>
            ) : (
              <p className="text-zinc-500">Saved to your account.</p>
            )}
          </div>
        )}

        <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-2">
          <label
            className="text-xs font-medium text-zinc-400"
            htmlFor="regenerate-prompt"
          >
            Prompt
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="regenerate-prompt"
              className="h-10 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400"
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the game to regenerate..."
              value={prompt}
            />
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={isRegenerating}
              onClick={handleRegenerate}
              type="button"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
          {regenerateError ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {regenerateError}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GameCanvas spec={spec} />
        <ParamsPanel
          onChange={setSpec}
          onValidityChange={setIsSpecValid}
          spec={spec}
        />
      </div>
    </main>
  );
}
