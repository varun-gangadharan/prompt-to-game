// Clerk is optional. When no publishable key is configured the app runs
// unauthenticated: prompt → generate → play all work, while save/publish and
// the /me library degrade gracefully (auth-required APIs return 401, auth UI
// is hidden). This lets the site build and deploy before Clerk keys exist —
// keyless mode only works in `next dev`, not in a production build.
//
// `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into client bundles at build
// time and is also readable on the server, so this constant is consistent
// across both environments.
export const clerkEnabled =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;
