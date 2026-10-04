#!/usr/bin/env bash
# Re-vendors the One Piece subset of TheCardGoat/tcg-engines.
#
#   scripts/sync-engine.sh [<ref>]      # default ref: main
#
# 1. Fetches <ref> from upstream (shallow).
# 2. Replaces the vendored subset with a pristine copy (git archive).
# 3. Re-applies our local engine changes, kept as vendor/patches/*.patch.
# 4. Records the upstream commit in vendor/tcg-engines/UPSTREAM.md.
# Review `git diff --stat vendor/` afterwards, run `pnpm run setup`,
# `pnpm run engine:check` and `pnpm run check`, then commit.
set -euo pipefail
REF="${1:-main}"
UPSTREAM_URL="https://github.com/TheCardGoat/tcg-engines.git"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/vendor/tcg-engines"
PATHS=(
  LICENSE
  submodules/one-piece
  submodules/agnostic-simulator/packages/bot-core
  submodules/agnostic-simulator/packages/engine-core
  submodules/agnostic-simulator/packages/protocol
  submodules/agnostic-simulator/packages/card-model
)
# Files inside the vendor tree that are ours, not upstream's.
LOCAL_FILES=(
  UPSTREAM.md
  submodules/agnostic-simulator/package.json
  submodules/agnostic-simulator/pnpm-workspace.yaml
  submodules/agnostic-simulator/pnpm-lock.yaml
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git init -q "$TMP/up"
git -C "$TMP/up" remote add origin "$UPSTREAM_URL"
git -C "$TMP/up" fetch -q --depth 1 origin "$REF"
SHA="$(git -C "$TMP/up" rev-parse FETCH_HEAD)"
DATE="$(git -C "$TMP/up" log -1 --format=%cI FETCH_HEAD)"

mkdir -p "$TMP/keep"
for f in "${LOCAL_FILES[@]}"; do
  if [ -e "$VENDOR/$f" ]; then
    mkdir -p "$TMP/keep/$(dirname "$f")"
    cp -a "$VENDOR/$f" "$TMP/keep/$f"
  fi
done

rm -rf "$VENDOR"
mkdir -p "$VENDOR"
git -C "$TMP/up" archive FETCH_HEAD "${PATHS[@]}" | tar -x -C "$VENDOR"
cp -a "$TMP/keep/." "$VENDOR/"

shopt -s nullglob
for p in "$ROOT"/vendor/patches/*.patch; do
  echo "applying $(basename "$p")"
  git -C "$ROOT" apply --3way "$p"
done

python3 - "$VENDOR/UPSTREAM.md" "$SHA" "$DATE" "$REF" <<'PY'
import re, sys
path, sha, date, ref = sys.argv[1:]
text = open(path).read()
text = re.sub(r"(?m)^- Commit: .*$", f"- Commit: `{sha}`", text)
text = re.sub(r"(?m)^- Commit date: .*$", f"- Commit date: {date}", text)
text = re.sub(r"(?m)^- Ref synced: .*$", f"- Ref synced: `{ref}`", text)
open(path, "w").write(text)
PY

echo "vendored $SHA ($DATE). Next: pnpm run setup && pnpm run engine:check && pnpm run check"
