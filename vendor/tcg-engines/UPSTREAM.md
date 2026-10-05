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
| `0003-rocks-xebec-deck-cards.patch` | Rocks.D.Xebec deck (OP17-039): [Counter] half of OP17-056; OP17-055 [Rocks.D.Xebec] can target the Leader (2-1-2); OP17-046 and OP17-053 types split into two (2-4-2); OP17-118 [On Play] uses the exact {Rocks Pirates} type (2-4-3) and rejects/omits picks over its total cost of 9; OP17-050 looks at 2 and puts them on top or bottom before drawing; OP17-045 Kyo removal replacement; OP17-049 [On Play] chosen by the opponent | Card-by-card audit of the most played deck (22% of the meta): 4 of its 16 counters were unusable and three On Play / replacement effects were missing, so simulated Rocks lost almost every game | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on the five patches applied together; each patch also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0004-xebec-hand-counter-newgate-when-you-attack.patch` | OP17-118 has a +2000 Counter in hand while you have Characters and none of them has a Counter (OP17 FAQ); new trigger `whenYouAttack` (another card reacts when your Leader or Character attacks, 7-1-1-3); OP17-040 Newgate's Leader +3000 when it attacks or is attacked, once per turn; simultaneous attack-timing effects of several cards are ordered by their controller, turn player first (8-6-1, 10-2-16-1) | The engine only fired [When Attacking] on the attacking card itself, so "when your Leader attacks" on another card could not be expressed | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on the five patches applied together; each patch also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0005-self-cost-zones-zoro-and-grouped-removal-replacements.patch` | OP15-088 Pirates Docking Six (and OP16-005, OP16-015, OP16-082): self "+N cost" only on the field (2-8-2), so the card is playable again; OP17-095 Zoro removal replacement (3 trash cards to the bottom of the deck); one replacement covers every Character removed at the same time, also for non-K.O. removals and with several copies (OP17 FAQ; affects OP15-090, OP15-052, OP11-101); heuristic picks respect "total cost N or less" (OP17-119 Loki) | OP15-088 cost 11 in hand and could never be played; Luffy mirror games stopped on illegal Loki picks | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on the five patches applied together; each patch also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0006-st30-luffy-ace-cards.patch` | Leader ST30-001 Luffy & Ace and ST30-012, ST21-014, ST31-001, ST21-017, ST31-005, plus card data fixes found while building the deck (OP14-019, OP01-016, OP14-031, OP11-012, OP12-018) | Sixth most played Leader (6.6%) was missing from the catalog | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on the five patches applied together; each patch also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0007-event-main-mandatory-costs-enel.patch` | `engine/legality.ts`: an Event cannot be played when a mandatory [Main] activation cost (e.g. DON!! −X) cannot be paid (8-3-1-3); OP15-077 "6000 power or less" filter; OP15-118 +2000 static | Enel's events (and Mamaragan in Kaido and Pudding) were played without paying their cost, leaving capability records and broken games | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on the five patches applied together; each patch also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |

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
