#!/usr/bin/env bash
set -euo pipefail

# One-shot local setup. Run from repo root.

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install: npm i -g pnpm" >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local — fill in secrets before running pnpm dev."
fi

pnpm install
echo
echo "Setup complete. Next:"
echo "  1. Fill .env.local"
echo "  2. pnpm dev"
