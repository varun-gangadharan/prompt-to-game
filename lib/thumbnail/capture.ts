// Owner: A4. Thumbnail pipeline.
//   - captureThumbnail(spec): client-side. Mounts the matching GameRenderer
//     off-screen, calls GameRenderer.snapshot(), then tears it down.
//   - uploadThumbnail(key, data): server-side. Uploads PNG bytes to Vercel
//     Blob and returns the public URL, or null when the token is absent.
//
// Heavy / environment-specific deps (Phaser renderers, @vercel/blob) are
// imported dynamically so this module is safe to import from both the client
// editor and server route handlers without leaking Phaser into the server
// bundle or the Blob token into the client bundle.

import type { GameRenderer } from "@/lib/renderer/GameRenderer";
import type { GameSpec } from "@/lib/spec/types";

const THUMB_WIDTH = 960;
const THUMB_HEIGHT = 540;

async function createRenderer(
  template: GameSpec["template"],
): Promise<GameRenderer | null> {
  switch (template) {
    case "platformer":
      return (await import("@/lib/renderer/platformer")).createPlatformerRenderer();
    case "shooter":
      return (await import("@/lib/renderer/shooter")).createShooterRenderer();
    case "runner":
      return (await import("@/lib/renderer/runner")).createRunnerRenderer();
    default:
      return null;
  }
}

/**
 * Render the spec into a detached off-screen container and snapshot it.
 * Best-effort: callers should treat a thrown error as "no thumbnail".
 */
export async function captureThumbnail(spec: GameSpec): Promise<Blob | null> {
  if (typeof window === "undefined") {
    throw new Error("captureThumbnail must run in the browser.");
  }

  const renderer = await createRenderer(spec.template);
  if (!renderer) {
    return null;
  }

  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${THUMB_WIDTH}px;height:${THUMB_HEIGHT}px;pointer-events:none;`;
  document.body.appendChild(container);

  try {
    renderer.mount(container, spec);
    // Give the renderer a couple of frames to draw the initial scene.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return await renderer.snapshot();
  } finally {
    try {
      renderer.destroy();
    } finally {
      container.remove();
    }
  }
}

/**
 * Upload PNG bytes to Vercel Blob under a stable per-game key.
 * Returns the public URL, or null if BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function uploadThumbnail(
  key: string,
  data: ArrayBuffer | Blob,
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn(
      "BLOB_READ_WRITE_TOKEN missing — skipping thumbnail upload, returning null.",
    );
    return null;
  }

  const { put } = await import("@vercel/blob");
  // addRandomSuffix avoids an overwrite conflict when a game is re-published;
  // the resulting URL is persisted on the game row, so stability isn't needed.
  const blob = await put(`thumbnails/${key}.png`, data, {
    access: "public",
    contentType: "image/png",
    token,
    addRandomSuffix: true,
  });
  return blob.url;
}
