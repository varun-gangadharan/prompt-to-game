"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { GameCanvas } from "@/components/editor/GameCanvas";
import { ParamsPanel } from "@/components/editor/ParamsPanel";
import { gameSpecSchema } from "@/lib/spec/schema";
import type { GameSpec } from "@/lib/spec/types";

const SPEC_STORAGE_PREFIX = "prompt-to-game:spec:";

export function EditorShell() {
  const searchParams = useSearchParams();
  const specId = searchParams.get("id");
  const [spec, setSpec] = useState<GameSpec | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const validation = useMemo(
    () => (spec ? gameSpecSchema.safeParse(spec) : null),
    [spec],
  );

  if (!spec) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-xl font-semibold text-white">Editor</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {loadError ?? "Loading generated spec..."}
          </p>
          <a
            className="mt-5 inline-flex h-10 items-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-zinc-950"
            href="/"
          >
            Generate a spec
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a className="text-sm text-zinc-500 hover:text-zinc-300" href="/">
              Prompt to Game
            </a>
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
                validation?.success
                  ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200"
                  : "rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200"
              }
            >
              {validation?.success ? "Valid spec" : "Needs edits"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GameCanvas spec={spec} />
        <ParamsPanel onChange={setSpec} spec={spec} validation={validation} />
      </div>
    </main>
  );
}
