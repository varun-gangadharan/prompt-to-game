"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { GameSpec } from "@/lib/spec/types";

const SPEC_STORAGE_PREFIX = "prompt-to-game:spec:";

type GenerateResponse =
  | {
      spec: GameSpec;
    }
  | {
      error: string;
    };

export function PromptGenerator() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "A platformer where a cat dodges falling toast in a neon bakery",
  );
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Enter a prompt to generate a game.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !("spec" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Generation failed.",
        );
      }

      window.sessionStorage.setItem(
        `${SPEC_STORAGE_PREFIX}${payload.spec.id}`,
        JSON.stringify(payload.spec),
      );
      const editorUrl =
        `/new?id=${encodeURIComponent(payload.spec.id)}` as Parameters<
          typeof router.push
        >[0];
      router.push(editorUrl);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-300">
              Prompt to Game
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Generate a playable game spec
            </h1>
          </div>
          <div className="hidden rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400 sm:block">
            v1 editor shell
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="max-w-2xl text-lg leading-8 text-zinc-300">
              Describe a small browser game. The generator returns a structured
              GameSpec, then opens the editor so parameters can be tuned.
            </p>

            <form className="mt-8 max-w-2xl" onSubmit={handleSubmit}>
              <label
                className="mb-3 block text-sm font-medium text-zinc-300"
                htmlFor="game-prompt"
              >
                Game prompt
              </label>
              <textarea
                id="game-prompt"
                className="min-h-36 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base leading-7 text-zinc-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                maxLength={500}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="A platformer where..."
                value={prompt}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                  disabled={isGenerating}
                  type="submit"
                >
                  {isGenerating ? "Generating..." : "Generate game"}
                </button>
                <span className="text-sm text-zinc-500">
                  Routes to /new with the generated spec.
                </span>
              </div>
              {error ? (
                <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="grid gap-3 text-sm text-zinc-300">
              <div className="rounded-md bg-zinc-950 p-4">
                <div className="text-zinc-500">Template</div>
                <div className="mt-1 font-medium text-zinc-100">
                  Platformer, shooter, or runner
                </div>
              </div>
              <div className="rounded-md bg-zinc-950 p-4">
                <div className="text-zinc-500">Editor</div>
                <div className="mt-1 font-medium text-zinc-100">
                  Schema-generated params panel
                </div>
              </div>
              <div className="rounded-md bg-zinc-950 p-4">
                <div className="text-zinc-500">Renderer</div>
                <div className="mt-1 font-medium text-zinc-100">
                  Placeholder mount until A2 lands
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
