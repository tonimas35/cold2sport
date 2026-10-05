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
| `0008-catalog-data-types-names-counters-triggers.patch` | Card data from `pnpm opbot catalog-check` (official EN card list): 1072 cards get one `traits` entry per printed type; 958 type checks follow the printed form ({Type} exact, 'a type including "X"' substring, 2-4-3), so {Straw Hat Crew} no longer accepts {Fake Straw Hat Crew}; 38 names (fixes [Trafalgar Law], [Mr.2], [Mr.3]... searches), 9 counters (OP17-027 Benn.Beckman had +9000), 4 attributes, 2 costs, 38 other type fixes; 13 cards with a [Trigger] field but no block get their [Trigger] | The importer joined multi-type cards into one string and wrote substring filters, and copied values between fields | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on 0001-0012 applied together; each of 0008-0011 also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0009-wrong-and-missing-effects.patch` | Cards that did the opposite of their text (OP17-042 Kaido gave the opponent +3000, OP13-017 Dragon +2000, OP11-023 Arlong set its cost to 3), two cards carrying another card's effect (OP11-020, OP13-084), 27 missing [Trigger] blocks and missing [On Play], [Counter], static and replacement abilities (OP17-003, OP17-005, OP17-043, OP17-015, EB04-048, OP16-038, OP16-100, OP16-076, OP17-116...); OP13-079 deck rule (its start-of-game Stage is not implemented) | Found by the catalog check's structure and sign categories | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on 0001-0012 applied together; each of 0008-0011 also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0010-meta-deck-cards-round-2.patch` | Second audit of the meta decks: OP17-074 Yamato and OP17-062 Kaido add DON!!; OP17-063 Kaido +1000 Counter in hand and its K.O. hits the negated Character; OP17-112 Linlin [Your Turn] base power 8000; OP17-104 Cracker and OP16-119 Teach [Trigger]s; OP17-036 [Counter]; ST32-002 base cost filter; OP17-041 Wang Zhi, OP15-073 Yama, OP12-018; counters from effects use the highest value (2-10-4); "If A, B. Then, C." gates C too (4-10-2, 8-3-3) for ST34-002, OP17-103, OP15-074/075/076, EB04-030, OP17-077 | Kaido, Robin, Pudding, Shanks and Enel lists played without their key cards | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on 0001-0012 applied together; each of 0008-0011 also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0011-alternative-costs-rest-cards-activation-costs.patch` | Cost DSL `choice` (OP17-020 Shanks: trash 1 OR rest 1 DON!!); "rest N of your cards" costs accept DON!! and prompt when there is a choice (OP17-037, OP14-020...); 8-3-1-3 activation costs also checked in the Counter Step, `activateEvent` and [Trigger]s (a [Trigger] whose mandatory cost cannot be paid cannot be activated); invalid prompt answers rejected; opponent views no longer see card ids of private logs; an [Activate: Main] declined right after activating must commit to paying if activated again before anything else happens (no endless activate-and-decline loop; declining still does not use up [Once Per Turn], 8-3-1-4, 10-2-13-1) | Engine gaps found by the Shanks audit and round-1 reviews | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on 0001-0012 applied together; each of 0008-0011 also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0012-type-checks-follow-printed-form.patch` | Integration of 0008-0011: nine type checks written by the card fixes with substring matching where the card prints {Type} are exact; new guard test `tests/cards/type-filter-printed-form.test.ts` walks the whole catalog; EB04-038 Rosinante & Law also counts as [Trafalgar Law] and [Donquixote Rosinante]; OP17-076 [Trigger] DON!! -1 is a mandatory cost (no "you may"); merged tests adjusted (Ramba OP16-016 now has its official +1000 Counter) | Keeps the catalog consistent across branches and against future upstream syncs | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games, on 0001-0012 applied together; each of 0008-0011 also checked by an independent adversarial review (official text, FAQ, command-driven edge cases) |
| `0013-once-per-turn-resets-every-turn.patch` | `state.ts` `resetStartOfTurnState`: the used marks of [Once Per Turn] effects are cleared at the start of every turn for both players' cards in play, not only for the player whose turn begins (10-2-13-1: once during each turn). Tests: OP17-058 Kaido Leader and OP17-040 Newgate used in their controller's turn are offered again in the opponent's next turn, and still only once per turn | An effect used during its controller's turn stayed used through the opponent's next turn: the Kaido Leader's [On Your Opponent's Attack] and the defensive half of Newgate and Shiki (Rocks) were lost every other turn. Diagnosis experiment (policy agents, 320 games): Rocks 42.8% -> 54.7% | Full upstream suite (no cache) 10/10 green and `sim-differential.test.ts` with 300 games |

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
