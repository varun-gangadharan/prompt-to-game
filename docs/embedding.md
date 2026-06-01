# Embedding a game

Every **published** game has a public play page at `/g/[slug]`. Add the
`embed=1` query parameter to strip the page chrome (header, footer, links) and
render just the game canvas — ideal for dropping into an `<iframe>`.

## Quick snippet

```html
<iframe
  src="https://your-app.example.com/g/your-slug?embed=1"
  width="800"
  height="600"
  frameborder="0"
  allow="autoplay; gamepad; fullscreen"
  title="Play my game"
></iframe>
```

Replace `your-app.example.com` with your deployment host and `your-slug` with
the slug returned by **Publish** (also visible in the share link on the editor).

## Notes

- **Only published games embed.** Private games return 404 on `/g/[slug]`, so
  the iframe will show the not-found page. Publish first.
- **`?embed=1` removes chrome only.** Same game, same renderer (`<canvas>`) as
  the full page — controls and behavior are identical.
- **Sizing.** The canvas scales to its container; the world's aspect ratio comes
  from `world.width` / `world.height` in the spec. Pick iframe dimensions close
  to that ratio to avoid letterboxing. `800×600` (4:3) is a safe default.
- **Keyboard focus.** Click the iframe once so it captures keyboard input before
  playing.
- **Responsive embed.** Wrap in an aspect-ratio box if you need fluid width:

```html
<div style="position: relative; aspect-ratio: 4 / 3; max-width: 800px;">
  <iframe
    src="https://your-app.example.com/g/your-slug?embed=1"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
    allow="autoplay; gamepad; fullscreen"
    title="Play my game"
  ></iframe>
</div>
```

## Social previews

Sharing the non-embed URL (`/g/[slug]`) yields a rich preview: the page sets
Open Graph / Twitter tags backed by `GET /api/og/[slug]`, a 1200×630 card built
from the game's thumbnail or themed palette. See [`api.md`](./api.md).
