import { Suspense } from "react";

import { EditorShell } from "@/components/editor/EditorShell";

export default function NewGamePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
          Loading editor...
        </main>
      }
    >
      <EditorShell />
    </Suspense>
  );
}
