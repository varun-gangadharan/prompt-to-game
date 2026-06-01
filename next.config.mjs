/** @type {import('next').NextConfig} */

// Baseline Content-Security-Policy. 'unsafe-eval' is required by Phaser (and by
// Next.js in dev for React Fast Refresh); 'unsafe-inline' covers Next's inline
// bootstrap + injected styles until a nonce-based pipeline is added.
// frame-ancestors is 'self' for now — widen deliberately if/when embedding the
// public /g/[slug] play page on partner origins is intended.
//
// Clerk loads clerk-js and talks to its Frontend API from *.clerk.accounts.dev
// / *.clerk.com (and uses Cloudflare Turnstile for bot protection), so those
// origins are allowed in script/connect/img/frame/worker. They are harmless
// when Clerk is disabled (nothing loads from them).
const clerk = "https://*.clerk.accounts.dev https://*.clerk.com";
const turnstile = "https://challenges.cloudflare.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerk} ${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${clerk}`,
  "worker-src 'self' blob:",
  `frame-src 'self' ${clerk} ${turnstile}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
