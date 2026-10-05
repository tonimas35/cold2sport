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
  submodules/agnostic-simulator/packages/typescript-config
  # Browser board UI used by packages/web (see UPSTREAM.md, "Web simulator UI").
  submodules/agnostic-simulator/packages/simulator-ui
  submodules/agnostic-simulator/packages/simulator-contract
  submodules/agnostic-simulator/packages/simulator-runtime
  # One Piece board components, projection and animation adapter only: the
  # app's pages and shared modules talk to the hosted platform (auth, gateway,
  # telemetry), and its board background (assets/) is left out on purpose.
  submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/components
  submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/data
  submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/animation
  submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/styles.css
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
  # A plain apply works on the freshly extracted tree whatever the index
  # holds. --3way needs the index to match the working tree (it refuses with
  # "does not match index" when the committed, already patched files are
  # staged), so it is only the fallback for a patch that no longer applies
  # cleanly after an upstream change: stage the pristine tree, then merge.
  if ! git -C "$ROOT" apply "$p"; then
    git -C "$ROOT" add -A vendor/tcg-engines
    git -C "$ROOT" apply --3way "$p"
  fi
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
