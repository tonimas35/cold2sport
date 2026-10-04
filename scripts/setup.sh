#!/usr/bin/env bash
# Installs every dependency needed to run the bot, the arena and the engine tests.
# Idempotent. Requires Node >= 24, pnpm 10.33 and Bun on PATH.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 1. Vendored One Piece engine, with its own upstream lockfile.
#    CI=1 skips its `prepare` script (`vp config`), which would otherwise point
#    this repository's git core.hooksPath at the vendored workspace.
CI=1 pnpm --dir vendor/tcg-engines/submodules/one-piece install --frozen-lockfile

# 2. Runtime deps of the vendored agnostic-simulator packages (zod, mutative).
pnpm --dir vendor/tcg-engines/submodules/agnostic-simulator install --frozen-lockfile

# 3. Our own workspace (packages/*).
pnpm install --frozen-lockfile

echo "setup: OK (node $(node --version), pnpm $(pnpm --version), bun $(bun --version))"
