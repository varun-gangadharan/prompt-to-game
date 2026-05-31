import type { GameSpec } from "@/lib/spec/types";

export function GameCanvas({ spec }: { spec: GameSpec }) {
  return (
    <section className="min-h-[560px] rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">GameCanvas</h2>
      </div>
      <div className="p-4">
        <div className="mb-4 flex h-72 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-950 text-center text-sm text-zinc-500">
          Renderer placeholder
        </div>
        <pre className="max-h-[520px] overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-300">
          {JSON.stringify(spec, null, 2)}
        </pre>
      </div>
    </section>
  );
}
