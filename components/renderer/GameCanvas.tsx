"use client";

import { useEffect, useMemo, useRef } from "react";

import type { GameRenderer } from "@/lib/renderer/GameRenderer";
import { createPlatformerRenderer } from "@/lib/renderer/platformer";
import type { GameSpec } from "@/lib/spec/types";

type GameCanvasProps = {
  spec: GameSpec;
};

function createRenderer(spec: GameSpec): GameRenderer | null {
  if (spec.template === "platformer") {
    return createPlatformerRenderer();
  }

  return null;
}

export function GameCanvas({ spec }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderer = useMemo(() => createRenderer(spec), [spec.template]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !renderer) {
      return;
    }

    renderer.mount(container, spec);

    return () => {
      renderer.destroy();
    };
  }, [renderer, spec]);

  return (
    <div
      ref={containerRef}
      aria-label={`${spec.title} game canvas`}
      style={{
        width: "100%",
        minHeight: 360,
        height: "min(68vh, 640px)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: spec.theme.palette[0],
      }}
    >
      {!renderer ? (
        <div style={{ color: spec.theme.palette[2], fontFamily: "sans-serif" }}>
          Renderer for {spec.template} is not implemented yet.
        </div>
      ) : null}
    </div>
  );
}
