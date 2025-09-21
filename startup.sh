#!/usr/bin/env bash
set -euo pipefail

if ! command -v corepack >/dev/null 2>&1; then
  npm i -g corepack
fi

corepack enable
corepack prepare pnpm@9.12.0 --activate

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"

pnpm install

echo "Running stories (ladle)..."
pnpm ladle || true

echo "Running tests..."
pnpm test || true

echo "Done. Start the app with:"
echo "pnpm --filter @acme/landing dev"
