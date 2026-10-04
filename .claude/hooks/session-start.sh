#!/bin/bash
# SessionStart hook for Claude Code cloud sessions: toolchain + dependencies.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

NODE_VERSION="24.12.0"
NODE_DIR="/opt/node24"

if [ ! -x "$NODE_DIR/bin/node" ] || [ "$("$NODE_DIR/bin/node" --version)" != "v$NODE_VERSION" ]; then
  mkdir -p "$NODE_DIR"
  curl -sSfL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" \
    | tar -xJ -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$HOME/.bun/bin:$PATH"

if [ "$(pnpm --version 2>/dev/null || true)" != "10.33.0" ]; then
  npm install -g pnpm@10.33.0 >/dev/null
fi
if ! command -v bun >/dev/null 2>&1; then
  npm install -g bun >/dev/null
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$NODE_DIR/bin:\$HOME/.bun/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

"$CLAUDE_PROJECT_DIR/scripts/setup.sh"
