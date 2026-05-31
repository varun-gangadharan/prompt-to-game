# API contracts

Owned by A3. Frozen at M0.

## POST /api/generate
```
req: { prompt: string }            // 1..500 chars
res: { spec: GameSpec }            // 200
err: { error: string }             // 400 invalid prompt, 422 unrepairable, 429 rate-limit
```

## POST /api/validate
```
req: { spec: unknown }
res: { ok: true, spec: GameSpec } | { ok: false, errors: ZodIssue[] }
```

## POST /api/games   (auth)
```
req: { spec: GameSpec, title?: string, visibility?: 'private'|'unlisted'|'public' }
res: { id: string }
```

## GET /api/games/:id
```
res: { id, title, template, spec, visibility, slug, thumbnailUrl, createdAt }
```

## PATCH /api/games/:id   (auth, owner)
```
req: Partial<{ spec, title, visibility }>
res: { ok: true }
```

## POST /api/games/:id/publish   (auth, owner)
```
res: { slug: string, thumbnailUrl: string }
```

## GET /api/og/:slug
Returns PNG image (1200x630) of game thumbnail + title.
