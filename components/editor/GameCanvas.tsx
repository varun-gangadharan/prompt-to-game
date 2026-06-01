"use client";

// The editor preview mounts the real Phaser renderer (the same component the
// public /g/[slug] play page uses) so /new is immediately playable. The render
// surface is a live <canvas>; the renderer recreates only when the template
// changes, so param edits update the running game in place.

import { GameCanvas as RendererCanvas } from "@/components/renderer/GameCanvas";
import type { GameSpec } from "@/lib/spec/types";

export function GameCanvas({ spec }: { spec: GameSpec }) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Preview</h2>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {spec.template}
        </span>
      </div>
      <RendererCanvas spec={spec} />
    </section>
  );
}
