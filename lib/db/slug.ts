// Owner: A4. Public share-slug minting. Slugs must match ^[a-z0-9-]{6,32}$.

const SLUG_RE = /^[a-z0-9-]{6,32}$/;

function randomSuffix(length = 6): string {
  // base36 over crypto bytes — collision-resistant enough with a uniqueness
  // retry loop on top.
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += (b % 36).toString(36);
  }
  return out;
}

/** Slugify a title into the [a-z0-9-] alphabet, no length guarantees. */
function baseSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/**
 * Build a candidate slug from a title plus a random suffix, clamped to the
 * 6..32 length window and guaranteed to satisfy SLUG_RE.
 */
export function mintSlugCandidate(title: string): string {
  const base = baseSlug(title);
  const suffix = randomSuffix(6);
  const joined = base ? `${base}-${suffix}` : suffix;
  const candidate = joined.slice(0, 32);
  // A pure-suffix slug is already >= 6 chars; pad defensively just in case.
  return candidate.length >= 6 ? candidate : `${candidate}${randomSuffix(6)}`.slice(0, 32);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
