# Vendored upstream: TheCardGoat/tcg-engines

- Repository: https://github.com/TheCardGoat/tcg-engines
- Commit: `53a79413c58678b1c50dde57e71de5c123132716`
- Commit date: 2026-10-01T19:28:30+02:00
- Ref synced: `main`
- License: MIT, see [LICENSE](LICENSE). Keep that file: the MIT license requires
  the copyright notice to travel with the code.

## What is vendored

Only what the One Piece engine needs at runtime and for its own test suite:

| Path | Why |
|---|---|
| `submodules/one-piece/` | Engine, cards, types, utils, card parser, rules skill and tests (unchanged upstream workspace, own `pnpm-lock.yaml`) |
| `submodules/agnostic-simulator/packages/{bot-core,engine-core,protocol,card-model}` | Imported by the engine at runtime (seeded RNG, bot helpers, card model) |
| `submodules/agnostic-simulator/packages/typescript-config` | `tsconfig.json` base that the four packages above extend (the engine's test runner needs it) |

Paths are kept identical to upstream so the engine's `link:` dependencies
(`../../../agnostic-simulator/packages/...`) resolve without changes.

Not vendored: the other games, the browser simulator, `tools/bot-lab` and
`tools/play-cli` (they link every other game's engine). Our own arena in
`packages/opbot` reimplements the evaluation protocol we need.

## Local files (not upstream)

- `submodules/agnostic-simulator/package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`: a tiny install that provides the runtime dependencies
  (`zod`, `mutative`) of the four vendored agnostic packages.

## Local changes to upstream code

| Patch | What | Why | Verified |
|---|---|---|---|
| `0001-permanent-effects-action-prefilter.patch` | `effects/permanent.ts`: every scan over permanent effects first checks a static, per-card index of the action kinds printed on that card's permanent effects, and skips cards that cannot contribute | The scans ran the in-play / negation / condition checks for every card on every power, cost or keyword query, which was quadratic and dominated the profile. Same results, about 2x faster `applyCommand` and 9x faster `getLegalCommands` | Full upstream suite (`pnpm run engine:check`): 10/10 tasks green. `packages/opbot/test/sim-differential.test.ts` (300 games) |
| `0002-st34-big-mom-cards-and-don-cost-order.patch` | Cards ST34-002 Charlotte Cracker, ST34-003 Charlotte Brulee, ST34-004 Charlotte Linlin (with tests and inventory rows). `effects/resolution.ts`: a DON!! −X cost with no real choice (8-3-1-6) is paid by default and no longer blocks the trash-from-hand cost that follows it (8-3-1-1) | Three meta decks (Kaido, Robin, Pudding) play these cards and were left out of the pool as unsupported; Linlin's "DON!! −4, trash 1" never asked for the trash | Full upstream suite (`pnpm run engine:check`, no cache): 10/10 tasks green. `sim-differential.test.ts` (120 games) |

Rules:

1. Do not edit vendored files casually. If the engine must change (bug fix,
   performance hook), make the change, then save it as
   `vendor/patches/NNNN-short-name.patch` (`git diff -- vendor/tcg-engines > ...`)
   and list it here with the reason. `scripts/sync-engine.sh` re-applies the
   patches after every upstream sync.
2. Rules bugs found while building the bot should also be reported upstream.

## Updating

```bash
scripts/sync-engine.sh            # or: scripts/sync-engine.sh <commit-sha>
pnpm run setup
pnpm run engine:check             # upstream One Piece test suite
pnpm run check                    # our typecheck + tests
```

Upstream publishes periodic exports from a private monorepo (commit messages
such as "W39 export"), so pin by commit SHA and never assume history is stable.
