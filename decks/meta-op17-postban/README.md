# Post-ban OP-17 meta deck pool

Generated 2026-10-05 by `bun packages/opbot/src/cli.ts meta-decks` from the Limitless Tournament Platform API (https://play.limitlesstcg.com/api). Rerunning it rewrites this folder; the raw API responses are cached in `out/limitless-cache/`.

- One deck per file, in the text format of `packages/opbot/src/decks/deck.ts`; load the folder with `loadDeckPool("decks/meta-op17-postban")` or `--decks decks/meta-op17-postban`.
- Decks the engine cannot play are kept in `unsupported/` (not part of the pool).

## Data

- Window: One Piece tournaments on Limitless dated 2026-08-28 (OP-17 EN release) or later: 77 listed, 73 Standard.
- Post-ban events used: **3**, dated 2026-09-28 to 2026-10-01.
- Entries: **274** with a known Leader (0 more without decklist or deck id, left out of the shares); 622 non-mirror matches with a result.
- Sample size: with 274 entries a 10% share is known to about ±3.6 points (95%), and the entries of one event are not independent; win rates over fewer than ~100 games are noise. Rerun after 2026-10-12 for a sturdier pool.

| Events | Classification |
|---:|---|
| 18 | excluded: < 32 players, ban not listed |
| 52 | excluded: before 2026-09-24, ban not listed |
| 2 | used: >= 32 players after 2026-09-24, no OP14-020 |
| 1 | used: bans OP14-020 |

Events used:

| Date | Event | Players | Decklists | Why it counts |
|---|---|---:|---|---|
| 2026-09-28 | [[OP17] ChinoizeCup #115 Monday](https://play.limitlesstcg.com/tournament/6ab4e5b8f127b1b52c28101c) | 128 | yes | >= 32 players after 2026-09-24, no OP14-020 |
| 2026-09-29 | [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) | 119 | yes | >= 32 players after 2026-09-24, no OP14-020 |
| 2026-10-01 | [[OP17 NEW BANNED] Win a box \| Rumble league #11](https://play.limitlesstcg.com/tournament/6ab613e7880ed327106dc30c) | 27 | yes | bans OP14-020 |

## Leader frequency (post-ban events)

| # | Leader | Name | Entries | Share | Win rate | Games | Pool |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | OP17-039 | Rocks.D.Xebec | 61 | 22.3% | 48.9% | 231 | yes |
| 2 | OP17-079 | Monkey.D.Luffy | 31 | 11.3% | 57.1% | 154 | yes |
| 3 | OP17-058 | Kaido | 21 | 7.7% | 49.5% | 101 | yes |
| 4 | OP15-058 | Enel | 19 | 6.9% | 48.2% | 85 | yes |
| 5 | ST30-001 | Luffy & Ace | 18 | 6.6% | 53.4% | 103 | yes |
| 6 | OP09-062 | Nico Robin | 15 | 5.5% | 46.5% | 71 | yes |
| 7 | OP13-004 | Sabo | 15 | 5.5% | 46.3% | 67 | yes |
| 8 | OP08-058 | Charlotte Pudding | 14 | 5.1% | 54.1% | 74 | yes |
| 9 | OP17-020 | Shanks | 12 | 4.4% | 40.0% | 55 | yes |
| 10 | OP12-061 | Donquixote Rosinante | 11 | 4.0% | 70.0% | 50 |  |
| 11 | OP14-041 | Boa Hancock | 6 | 2.2% | 60.0% | 30 |  |
| 12 | OP13-002 | Portgas.D.Ace | 4 | 1.5% | 56.5% | 23 |  |
| 13 | OP05-098 | Enel | 4 | 1.5% | 54.2% | 24 |  |
| 14 | OP17-001 | Edward.Newgate | 3 | 1.1% | 56.3% | 16 |  |
| 15 | OP10-001 | Smoker | 3 | 1.1% | 42.9% | 14 |  |
| 16 | OP08-098 | Kalgara | 2 | 0.7% | 70.0% | 10 |  |
| 17 | OP16-001 | Portgas.D.Ace | 2 | 0.7% | 58.3% | 12 |  |
| 18 | OP15-001 | Krieg | 2 | 0.7% | 55.6% | 9 |  |
| 19 | OP13-079 | Imu | 2 | 0.7% | 45.5% | 11 |  |
| 20 | OP14-080 | Gecko Moria | 2 | 0.7% | 40.0% | 10 |  |
| 21 | OP16-079 | Yamato | 2 | 0.7% | 37.5% | 8 |  |
| 22 | OP12-020 | Roronoa Zoro | 2 | 0.7% | 33.3% | 3 |  |
| 23 | OP14-040 | Jinbe | 2 | 0.7% | 25.0% | 4 |  |
| 24 | OP13-001 | Monkey.D.Luffy | 2 | 0.7% | 20.0% | 5 |  |
| 25 | OP16-022 | Monkey.D.Luffy | 2 | 0.7% | 20.0% | 5 |  |
| 26 | OP12-040 | Kuzan | 1 | 0.4% | 57.1% | 7 |  |
| 27 | OP13-100 | Jewelry Bonney | 1 | 0.4% | 57.1% | 7 |  |
| 28 | OP15-098 | Monkey.D.Luffy | 1 | 0.4% | 50.0% | 4 |  |
| 29 | EB01-021 | Hannyabal | 1 | 0.4% | 42.9% | 7 |  |
| 30 | EB01-001 | Kouzuki Oden | 1 | 0.4% | 33.3% | 6 |  |
| 31 | OP16-060 | Sengoku | 1 | 0.4% | 33.3% | 3 |  |
| 32 | OP11-001 | Koby | 1 | 0.4% | 25.0% | 4 |  |
| 33 | OP14-060 | Donquixote Doflamingo | 1 | 0.4% | 25.0% | 4 |  |
| 34 | OP16-080 | Marshall.D.Teach | 1 | 0.4% | 25.0% | 4 |  |
| 35 | ST21-001 | Monkey.D.Luffy | 1 | 0.4% | 16.7% | 6 |  |
| 36 | OP09-022 | Lim | 1 | 0.4% | 0.0% | 2 |  |
| 37 | OP11-040 | Monkey.D.Luffy | 1 | 0.4% | 0.0% | 2 |  |
| 38 | OP12-041 | Sanji | 1 | 0.4% | 0.0% | 2 |  |
| 39 | OP12-081 | Koala | 1 | 0.4% | 0.0% | 3 |  |
| 40 | OP15-022 | Brook | 1 | 0.4% | 0.0% | 2 |  |
| 41 | OP16-041 | Buggy | 1 | 0.4% | 0.0% | 4 |  |
| 42 | ST10-002 | Monkey.D.Luffy | 1 | 0.4% | 0.0% | 2 |  |

## Pool

The 9 most played Leaders that have a representative list; 9 of them are playable by the engine and form the pool, the others are in `unsupported/`.

| File | Leader | Share | Win rate (games) | Representative list | Engine |
|---|---|---:|---|---|---|
| `OP17-039-rocks-d-xebec.txt` | OP17-039 Rocks.D.Xebec | 22.3% | 48.9% (231) | PolGoFo (polgofo), 1/128 at [[OP17] ChinoizeCup #115 Monday](https://play.limitlesstcg.com/tournament/6ab4e5b8f127b1b52c28101c) 2026-09-28 | playable |
| `OP17-079-monkey-d-luffy.txt` | OP17-079 Monkey.D.Luffy | 11.3% | 57.1% (154) | snorlax1cynda (snorlax1cynda), 1/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP17-058-kaido.txt` | OP17-058 Kaido | 7.7% | 49.5% (101) | HalfJimmy (halfjimmy), 7/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP15-058-enel.txt` | OP15-058 Enel | 6.9% | 48.2% (85) | Martix (martix), 6/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `ST30-001-luffy-ace.txt` | ST30-001 Luffy & Ace | 6.6% | 53.4% (103) | not_dev (not_dev), 5/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP09-062-nico-robin.txt` | OP09-062 Nico Robin | 5.5% | 46.5% (71) | krabbys (krabbys), 13/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP13-004-sabo.txt` | OP13-004 Sabo | 5.5% | 46.3% (67) | Willerd7 (willerd7), 4/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP08-058-charlotte-pudding.txt` | OP08-058 Charlotte Pudding | 5.1% | 54.1% (74) | Simpiii (simpiii), 9/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |
| `OP17-020-shanks.txt` | OP17-020 Shanks | 4.4% | 40.0% (55) | zockerdima (zockerdima), 30/119 at [[OP17] ChinoizeCup #116 Tuesday](https://play.limitlesstcg.com/tournament/6ab4e651e905c1db687493fe) 2026-09-29 | playable |

## Consensus lists

For each pool Leader, every complete post-ban list (all event sizes): the share of lists that play each card, the average and most common copy count among those lists, and the copies in the representative list.

### OP17-039 Rocks.D.Xebec (61 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-040 | Edward.Newgate | 100% | 4.0 | 4 | 4 |
| OP17-046 | Gloriosa | 100% | 4.0 | 4 | 4 |
| OP17-048 | Shiki | 100% | 4.0 | 4 | 4 |
| OP17-055 | There's No Authority in the World That Lasts Forever!!! | 100% | 4.0 | 4 | 4 |
| OP17-056 | Rocks Pirates | 100% | 4.0 | 4 | 4 |
| OP17-118 | Rocks.D.Xebec | 100% | 4.0 | 4 | 4 |
| OP17-045 | Kyo | 100% | 4.0 | 4 | 4 |
| OP17-049 | Charlotte Linlin | 100% | 4.0 | 4 | 4 |
| OP17-054 | Miss Buckingham Stussy | 100% | 3.9 | 4 | 4 |
| OP17-044 | Captain John | 95% | 2.6 | 2 | 2 |
| OP08-051 | Buckin | 93% | 3.3 | 4 | 4 |
| OP17-050 | Streusen | 89% | 3.1 | 4 | 4 |
| OP17-052 | Don Marlon | 79% | 2.9 | 3 | 4 |
| OP17-042 | Kaido | 57% | 2.4 | 2 | 0 |
| OP17-041 | Wang Zhi | 34% | 2.5 | 2 | 0 |
| EB02-030 | And That's When Somebody Makes Fun of Their Friend's Dream!!!! | 34% | 1.7 | 2 | 0 |
| OP14-049 | Jinbe | 21% | 1.1 | 1 | 0 |
| OP17-043 | Ganzui | 15% | 2.6 | 3 | 0 |
| OP17-053 | Barbell | 2% | 2.0 | 2 | 0 |
| OP06-058 | Gravity Blade Raging Tiger | 2% | 1.0 | 1 | 0 |
| OP09-051 | Buggy | 2% | 1.0 | 1 | 0 |
| OP17-057 | Fullalead | 2% | 1.0 | 1 | 0 |
| ST33-003 | Smoker | 2% | 1.0 | 1 | 0 |

### OP17-079 Monkey.D.Luffy (31 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-080 | Usopp | 100% | 4.0 | 4 | 4 |
| OP17-081 | Gerd | 100% | 4.0 | 4 | 4 |
| OP17-119 | Loki | 100% | 4.0 | 4 | 4 |
| OP17-095 | Roronoa Zoro | 100% | 4.0 | 4 | 4 |
| OP17-094 | Rodo | 100% | 3.9 | 4 | 4 |
| OP15-088 | Pirates Docking Six | 100% | 3.8 | 4 | 4 |
| OP17-087 | Nico Robin | 100% | 3.8 | 4 | 4 |
| OP17-082 | Sanji | 100% | 3.7 | 4 | 4 |
| OP17-093 | Monkey.D.Luffy | 100% | 3.6 | 4 | 4 |
| OP17-089 | Jaguar.D.Saul | 100% | 3.6 | 4 | 4 |
| OP17-086 | Nami | 94% | 3.2 | 3 | 4 |
| OP17-084 | Tony Tony.Chopper | 90% | 1.8 | 2 | 2 |
| ST14-017 | Thousand Sunny | 84% | 3.2 | 3 | 4 |
| OP17-098 | Gum-Gum Kong Gun | 68% | 1.7 | 2 | 0 |
| OP17-091 | Brook | 61% | 2.3 | 2 | 0 |
| OP17-090 | Franky | 32% | 1.7 | 2 | 0 |
| OP14-096 | Ground Death | 13% | 1.5 | 2 | 0 |
| OP15-092 | Monkey.D.Luffy | 13% | 1.0 | 1 | 0 |
| OP07-096 | Tempest Kick | 10% | 3.0 | 4 | 0 |
| OP17-096 | I'm Luffy!! The Man Who Will Be King of the Pirates!! | 10% | 1.7 | 2 | 0 |
| OP05-082 | Shirahoshi | 6% | 2.5 | 3 | 0 |
| OP11-097 | After All These Years I'm Losing My Edge!!! | 3% | 2.0 | 2 | 0 |
| OP03-097 | Six King Pistol | 3% | 1.0 | 1 | 0 |
| OP05-081 | One-Legged Toy Soldier | 3% | 1.0 | 1 | 0 |
| OP07-085 | Stussy | 3% | 1.0 | 1 | 0 |
| OP17-083 | Jinbe | 3% | 1.0 | 1 | 0 |

### OP17-058 Kaido (21 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| EB04-031 | King | 100% | 4.0 | 4 | 4 |
| EB04-032 | Queen | 100% | 4.0 | 4 | 4 |
| OP07-077 | We're Going to Claim the One Piece!!! | 100% | 4.0 | 4 | 4 |
| OP15-078 | Mamaragan | 100% | 3.8 | 4 | 4 |
| OP17-062 | Kaido | 100% | 3.7 | 4 | 4 |
| OP07-076 | Slow-Slow Beam Sword | 100% | 2.8 | 3 | 3 |
| OP17-073 | Basil Hawkins | 95% | 4.0 | 4 | 4 |
| OP17-074 | Yamato | 95% | 4.0 | 4 | 4 |
| ST34-004 | Charlotte Linlin | 95% | 3.0 | 3 | 3 |
| OP17-065 | Queen | 90% | 2.1 | 2 | 2 |
| OP17-063 | Kaido | 90% | 1.9 | 2 | 2 |
| OP17-061 | Lead Performers | 86% | 3.3 | 3 | 4 |
| EB04-030 | Kaido | 62% | 1.5 | 2 | 1 |
| OP09-077 | Gum-Gum Lightning | 57% | 1.8 | 2 | 0 |
| OP08-074 | Black Maria | 52% | 3.4 | 4 | 2 |
| OP13-076 | Divine Departure | 48% | 1.9 | 1 | 1 |
| EB04-040 | Flame Dragon Torch | 43% | 2.0 | 2 | 0 |
| OP17-076 | Wo Ro Ro Ro Ro... I Think I've Sobered Up | 43% | 1.6 | 1 | 0 |
| OP17-075 | X.Drake | 33% | 3.3 | 4 | 1 |
| OP08-069 | Charlotte Linlin | 33% | 2.0 | 2 | 0 |
| OP17-077 | Kundali Dragon Swarm | 29% | 1.8 | 2 | 2 |
| OP17-069 | Jack | 19% | 1.8 | 1 | 1 |
| ST10-010 | Trafalgar Law | 14% | 2.0 | 2 | 0 |
| OP17-067 | Kurozumi Kanjuro | 14% | 1.7 | 2 | 0 |
| OP06-076 | Hitokiri Kamazo | 10% | 2.0 | 2 | 0 |
| OP15-077 | Lightning Dragon | 10% | 2.0 | 2 | 0 |
| OP17-070 | Scratchmen Apoo | 10% | 1.5 | 2 | 0 |
| OP17-060 | Ulti & Page One | 10% | 1.0 | 1 | 0 |
| OP07-064 | Sanji | 5% | 4.0 | 4 | 0 |
| OP11-067 | Charlotte Katakuri | 5% | 3.0 | 3 | 0 |
| OP12-071 | Charlotte Pudding | 5% | 2.0 | 2 | 0 |
| OP14-069 | Donquixote Doflamingo | 5% | 2.0 | 2 | 0 |
| OP15-069 | Nola | 5% | 2.0 | 2 | 0 |
| OP17-068 | Sasaki | 5% | 2.0 | 2 | 0 |
| OP17-078 | Drunken Dragon Bagua | 5% | 2.0 | 2 | 0 |
| ST18-001 | Uso-Hachi | 5% | 2.0 | 2 | 0 |

### OP15-058 Enel (19 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP15-061 | Ohm | 100% | 4.0 | 4 | 4 |
| OP15-067 | Shura | 100% | 4.0 | 4 | 4 |
| OP15-075 | El Thor | 100% | 4.0 | 4 | 4 |
| OP15-076 | Lightning Beast Kiten | 100% | 4.0 | 4 | 4 |
| OP15-078 | Mamaragan | 100% | 4.0 | 4 | 4 |
| OP15-077 | Lightning Dragon | 100% | 3.9 | 4 | 4 |
| OP12-071 | Charlotte Pudding | 100% | 3.8 | 4 | 4 |
| OP05-077 | Gamma Knife | 100% | 2.7 | 3 | 2 |
| OP15-066 | Satori | 100% | 2.3 | 2 | 1 |
| OP10-067 | Senor Pink | 100% | 2.2 | 2 | 2 |
| OP15-074 | Varie | 95% | 2.9 | 3 | 2 |
| ST10-010 | Trafalgar Law | 95% | 2.9 | 3 | 4 |
| OP15-118 | Enel | 95% | 2.8 | 2 | 2 |
| OP13-076 | Divine Departure | 95% | 1.1 | 1 | 2 |
| OP09-077 | Gum-Gum Lightning | 89% | 1.3 | 1 | 2 |
| OP15-071 | Holly | 84% | 3.3 | 3 | 3 |
| OP07-064 | Sanji | 58% | 1.3 | 1 | 0 |
| OP09-072 | Franky | 47% | 1.7 | 2 | 2 |
| OP15-069 | Nola | 11% | 3.0 | 3 | 0 |
| OP12-063 | Vinsmoke Reiju | 5% | 2.0 | 2 | 0 |
| OP15-060 | Enel | 5% | 1.0 | 1 | 0 |

### ST30-001 Luffy & Ace (18 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| EB02-017 | Nami | 100% | 4.0 | 4 | 4 |
| OP01-016 | Nami | 100% | 4.0 | 4 | 4 |
| OP12-015 | Monkey.D.Luffy | 100% | 4.0 | 4 | 4 |
| ST21-014 | Monkey.D.Luffy | 100% | 4.0 | 4 | 4 |
| ST31-001 | Sanji | 100% | 4.0 | 4 | 4 |
| ST31-005 | Thousand Sunny | 100% | 4.0 | 4 | 4 |
| EB04-002 | Jewelry Bonney | 100% | 3.9 | 4 | 4 |
| OP04-016 | Bad Manners Kick Course | 100% | 3.9 | 4 | 3 |
| ST30-012 | Monkey.D.Luffy | 100% | 3.8 | 4 | 3 |
| OP13-040 | I Know You're Strong... So I'll Go All Out from the Very Start!!! | 100% | 2.3 | 2 | 2 |
| OP12-037 | Demon Aura Nine Sword Style Asura Blades Drawn Dead Man's Game | 100% | 2.1 | 2 | 2 |
| OP17-017 | Ga Ha Ha Ha!! | 83% | 3.6 | 4 | 4 |
| OP14-019 | I Have a Plan to Take Down One of the Four Emperors!! | 67% | 2.9 | 3 | 3 |
| ST21-017 | Gum-Gum Mole Pistol | 67% | 1.2 | 1 | 1 |
| OP12-018 | Color of the Supreme King Haki | 33% | 1.5 | 2 | 0 |
| OP06-018 | Gum-Gum King Kong Gatling | 33% | 1.2 | 1 | 0 |
| OP06-017 | Meteor-Strike of Love | 28% | 1.6 | 2 | 1 |
| OP15-032 | Brook | 28% | 1.2 | 1 | 0 |
| OP01-055 | You Can Be My Samurai!! | 22% | 2.5 | 3 | 0 |
| OP12-006 | Shakuyaku | 22% | 1.0 | 1 | 0 |
| OP12-038 | Two-Sword Style Rashomon | 17% | 1.7 | 2 | 0 |
| OP14-018 | Time for the Counterattack | 11% | 3.0 | 3 | 0 |
| OP14-031 | Nami | 11% | 2.0 | 3 | 1 |
| EB02-021 | Gum-Gum Giant Pistol | 11% | 1.5 | 2 | 0 |
| ST21-003 | Sanji | 11% | 1.0 | 1 | 0 |
| OP10-005 | Sanji | 6% | 3.0 | 3 | 0 |
| OP08-023 | Carrot | 6% | 2.0 | 2 | 0 |
| OP08-036 | Electrical Luna | 6% | 2.0 | 2 | 2 |
| OP11-012 | Franky | 6% | 2.0 | 2 | 0 |
| OP14-034 | Monkey.D.Luffy | 6% | 2.0 | 2 | 0 |
| OP17-022 | Shanks | 6% | 1.0 | 1 | 0 |
| ST31-004 | Monkey.D.Luffy | 6% | 1.0 | 1 | 0 |

### OP09-062 Nico Robin (15 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-109 | Charlotte Pudding | 100% | 4.0 | 4 | 4 |
| OP17-112 | Charlotte Linlin | 100% | 4.0 | 4 | 4 |
| OP17-114 | Sweet 3 Generals | 100% | 4.0 | 4 | 4 |
| OP17-074 | Yamato | 100% | 3.9 | 4 | 4 |
| OP17-102 | Charlotte Oven | 100% | 3.9 | 4 | 4 |
| OP17-106 | Charlotte Smoothie | 100% | 3.9 | 4 | 4 |
| OP17-107 | Charlotte Daifuku | 100% | 3.9 | 4 | 4 |
| OP17-113 | Streusen | 100% | 3.5 | 4 | 3 |
| OP16-119 | Marshall.D.Teach | 93% | 3.6 | 4 | 4 |
| OP17-110 | Charlotte Perospero | 93% | 2.3 | 2 | 2 |
| OP09-078 | Gum-Gum Giant | 87% | 3.6 | 4 | 4 |
| ST34-003 | Charlotte Brulee | 87% | 3.4 | 4 | 4 |
| EB04-058 | Borsalino | 80% | 2.3 | 2 | 2 |
| OP12-112 | Baby 5 | 67% | 2.6 | 2 | 3 |
| OP05-073 | Miss Doublefinger(Zala) | 33% | 2.8 | 3 | 0 |
| OP17-111 | Charlotte Mont-d'or | 27% | 1.8 | 2 | 0 |
| OP17-108 | Charlotte Brulee | 13% | 4.0 | 4 | 0 |
| OP11-106 | Zeus | 13% | 2.5 | 3 | 0 |
| OP13-076 | Divine Departure | 13% | 2.0 | 2 | 0 |
| ST36-005 | Eustass"Captain"Kid | 13% | 2.0 | 2 | 0 |
| EB04-059 | Black Rope Dragon Twister | 13% | 1.5 | 2 | 0 |
| OP11-067 | Charlotte Katakuri | 13% | 1.5 | 2 | 0 |
| OP08-076 | It's to Die For... | 7% | 4.0 | 4 | 0 |
| OP07-076 | Slow-Slow Beam Sword | 7% | 2.0 | 2 | 0 |
| OP17-076 | Wo Ro Ro Ro Ro... I Think I've Sobered Up | 7% | 2.0 | 2 | 0 |
| ST26-005 | Monkey.D.Luffy | 7% | 2.0 | 2 | 0 |

### OP13-004 Sabo (15 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-080 | Usopp | 100% | 4.0 | 4 | 4 |
| OP17-089 | Jaguar.D.Saul | 100% | 4.0 | 4 | 4 |
| OP17-095 | Roronoa Zoro | 100% | 4.0 | 4 | 4 |
| OP17-087 | Nico Robin | 100% | 3.7 | 4 | 4 |
| OP17-119 | Loki | 100% | 3.7 | 4 | 3 |
| OP17-093 | Monkey.D.Luffy | 100% | 3.5 | 4 | 4 |
| OP15-088 | Pirates Docking Six | 100% | 3.3 | 3 | 3 |
| OP17-082 | Sanji | 100% | 3.3 | 4 | 4 |
| OP17-084 | Tony Tony.Chopper | 100% | 2.3 | 2 | 2 |
| ST01-011 | Brook | 93% | 3.1 | 3 | 3 |
| OP17-086 | Nami | 93% | 2.4 | 2 | 4 |
| OP04-016 | Bad Manners Kick Course | 93% | 2.1 | 2 | 2 |
| OP17-083 | Jinbe | 87% | 1.8 | 2 | 2 |
| OP01-016 | Nami | 73% | 2.0 | 2 | 0 |
| OP14-096 | Ground Death | 60% | 2.0 | 2 | 0 |
| EB04-007 | Roronoa Zoro | 47% | 2.0 | 2 | 0 |
| OP17-081 | Gerd | 47% | 1.7 | 1 | 0 |
| OP17-096 | I'm Luffy!! The Man Who Will Be King of the Pirates!! | 40% | 2.2 | 2 | 3 |
| OP17-098 | Gum-Gum Kong Gun | 40% | 1.8 | 2 | 0 |
| OP17-088 | Hajrudin | 20% | 4.0 | 4 | 0 |
| OP13-007 | Ace & Sabo & Luffy | 20% | 2.3 | 4 | 2 |
| OP16-003 | Edward.Newgate | 20% | 2.3 | 3 | 0 |
| OP13-016 | Monkey.D.Garp | 20% | 2.0 | 2 | 0 |
| OP07-002 | Ain | 13% | 2.0 | 2 | 0 |
| ST21-003 | Sanji | 7% | 4.0 | 4 | 0 |
| OP11-012 | Franky | 7% | 3.0 | 3 | 0 |
| OP15-092 | Monkey.D.Luffy | 7% | 2.0 | 2 | 2 |
| OP16-020 | If You're Coming with Me... Kiss Your Lives Goodbye!! | 7% | 2.0 | 2 | 0 |
| ST21-017 | Gum-Gum Mole Pistol | 7% | 2.0 | 2 | 0 |

### OP08-058 Charlotte Pudding (14 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-103 | Charlotte Katakuri | 100% | 4.0 | 4 | 4 |
| OP17-109 | Charlotte Pudding | 100% | 4.0 | 4 | 4 |
| OP17-112 | Charlotte Linlin | 100% | 4.0 | 4 | 4 |
| OP17-114 | Sweet 3 Generals | 100% | 4.0 | 4 | 4 |
| OP08-062 | Charlotte Katakuri | 100% | 3.9 | 4 | 4 |
| OP17-113 | Streusen | 100% | 3.8 | 4 | 4 |
| OP17-107 | Charlotte Daifuku | 93% | 3.3 | 4 | 2 |
| OP07-077 | We're Going to Claim the One Piece!!! | 93% | 3.0 | 4 | 2 |
| OP17-104 | Charlotte Cracker | 93% | 2.8 | 3 | 3 |
| OP11-067 | Charlotte Katakuri | 93% | 1.9 | 2 | 2 |
| OP11-106 | Zeus | 86% | 3.4 | 4 | 3 |
| OP17-074 | Yamato | 86% | 3.4 | 3 | 3 |
| ST34-002 | Charlotte Cracker | 86% | 3.1 | 3 | 3 |
| OP15-078 | Mamaragan | 79% | 3.8 | 4 | 4 |
| ST34-003 | Charlotte Brulee | 71% | 1.8 | 2 | 2 |
| OP13-076 | Divine Departure | 50% | 1.0 | 1 | 1 |
| OP11-070 | Charlotte Pudding | 21% | 3.3 | 4 | 0 |
| OP08-077 | Conquest of the Sea | 21% | 1.0 | 1 | 1 |
| EB04-058 | Borsalino | 14% | 3.0 | 4 | 0 |
| OP05-073 | Miss Doublefinger(Zala) | 14% | 3.0 | 4 | 0 |
| EB03-051 | Charlotte Smoothie | 14% | 2.5 | 4 | 0 |
| OP08-063 | Charlotte Katakuri | 7% | 4.0 | 4 | 0 |
| OP17-111 | Charlotte Mont-d'or | 7% | 2.0 | 2 | 0 |
| OP17-102 | Charlotte Oven | 7% | 1.0 | 1 | 0 |
| ST34-004 | Charlotte Linlin | 7% | 1.0 | 1 | 0 |

### OP17-020 Shanks (12 lists)

| Card | Name | Lists | Avg copies | Most common | Representative |
|---|---|---:|---:|---:|---:|
| OP17-031 | Yasopp | 100% | 4.0 | 4 | 4 |
| OP17-027 | Benn.Beckman | 100% | 3.9 | 4 | 4 |
| OP17-022 | Shanks | 100% | 3.7 | 4 | 3 |
| OP17-036 | Withdraw Now and Allow Me to Save Face | 100% | 2.4 | 3 | 3 |
| OP17-032 | Limejuice | 92% | 3.8 | 4 | 4 |
| OP17-033 | Lucky.Roux | 92% | 3.6 | 4 | 4 |
| OP17-021 | Crone Oli | 92% | 3.5 | 4 | 4 |
| OP17-037 | Are You That Afraid of the New Era?!! | 92% | 3.5 | 4 | 4 |
| ST32-002 | Kouzuki Oden | 92% | 3.2 | 3 | 3 |
| ST16-004 | Shanks | 92% | 2.1 | 3 | 2 |
| OP17-029 | Hongo | 83% | 3.5 | 4 | 3 |
| OP13-031 | Trafalgar Law | 83% | 3.0 | 3 | 3 |
| ST32-001 | Kin'emon | 67% | 3.5 | 4 | 0 |
| OP17-028 | Bonk Punch & Monster | 58% | 2.9 | 3 | 3 |
| OP17-038 | I Think He's Seen an Ugly Future... | 50% | 1.3 | 1 | 0 |
| OP12-034 | Perona | 33% | 3.8 | 4 | 3 |
| OP17-026 | Fugar | 33% | 3.0 | 4 | 0 |
| OP06-033 | Vander Decken IX | 25% | 3.3 | 3 | 0 |
| OP12-023 | Kawamatsu | 25% | 3.3 | 4 | 0 |
| OP01-055 | You Can Be My Samurai!! | 25% | 3.0 | 4 | 0 |
| OP08-036 | Electrical Luna | 25% | 2.3 | 3 | 3 |
| OP12-037 | Demon Aura Nine Sword Style Asura Blades Drawn Dead Man's Game | 25% | 1.7 | 2 | 0 |
| OP07-026 | Jewelry Bonney | 17% | 2.0 | 2 | 0 |
| OP10-030 | Smoker | 17% | 2.0 | 2 | 0 |
| OP13-040 | I Know You're Strong... So I'll Go All Out from the Very Start!!! | 17% | 2.0 | 2 | 0 |
| OP07-022 | Otama | 8% | 4.0 | 4 | 0 |
| EB04-018 | Megalo | 8% | 2.0 | 2 | 0 |
| OP14-038 | I Never Bother to Remember the Faces of Trash | 8% | 2.0 | 2 | 0 |
| OP17-024 | Howling Gab | 8% | 2.0 | 2 | 0 |
| ST32-005 | Roronoa Zoro | 8% | 2.0 | 2 | 0 |
| ST24-004 | Law & Bepo | 8% | 1.0 | 1 | 0 |

## Engine support

720 heuristic-vs-heuristic games on the fast simulator, 20 per pair of pool decks (seats and first player alternate). Overall: 720 finished by the rules, 0 hit the 1500-command cap, 0 stalled, 0 stopped on an illegal command with no legal fallback, 0 crashed; 0 commands rejected by the engine (each replaced by a legal fallback, the game went on); 0 capability records in total (`state.capabilityHistory`: effects the engine could not execute).

Per deck: games it played and how they ended; rejected commands, illegal-command stops and capability records are those caused by the deck's own seat, with the cards behind them. "Bot win %" is heuristic vs heuristic and only flags decks the engine cannot really play.

| Deck | Missing cards | checkDeck | Games | Rules end | Cmd cap / stall | Rejected cmds / illegal stops | Crashes | Capability records | Games with records | Bot win % | Cards behind stops and records |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| OP17-039-rocks-d-xebec | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 49% | none |
| OP17-079-monkey-d-luffy | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 85% | none |
| OP17-058-kaido | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 1% | none |
| OP15-058-enel | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 12% | none |
| ST30-001-luffy-ace | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 82% | none |
| OP09-062-nico-robin | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 39% | none |
| OP13-004-sabo | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 77% | none |
| OP08-058-charlotte-pudding | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 34% | none |
| OP17-020-shanks | none | pass | 160 | 160 | 0 / 0 | 0 / 0 | 0 | 0 | 0 | 71% | none |

## Methodology

1. **Events.** `GET /tournaments?game=OP`, every page back to 2026-08-28 (OP-17 EN release). Standard only: format null or `STANDARD`; format `EXTRA` and names containing `[EGB]` are dropped.
2. **Post-ban filter** (the OP14-020 Dracule Mihawk Leader ban was announced 2026-09-24, effective 2026-10-12). An event is used only if (a) `details.bannedCards` contains OP14-020, or (b) it is dated 2026-09-24 or later, has >= 32 players and not a single OP14-020 entry in its standings, or (c) it is dated 2026-10-12 or later. Dates are the scheduled start in UTC. Every other event is ignored for everything below.
3. **Leader of an entry**: the decklist Leader (`set-number`), else the standings' auto-assigned `deck.id` (the Leader id). Entries with neither are counted separately and left out.
4. **Share** = entries with the Leader / entries with a known Leader, over all used events (each entry counts once, whatever the event size).
5. **Win rate** from `/pairings`: matches between two entries with known, different Leaders (byes and mirrors skipped); wins + ties/2 over matches; a double loss (-1) is a loss for both. A best-of-three top-cut match counts as one game. "games" in the deck headers means these matches.
6. **Pool**: the 9 most played Leaders (ties: higher win rate). A Leader is skipped, and the next one takes its place, if it is not in the engine catalog (`hasCard`) or has no complete, Standard-legal 50-card list in a used event with >= 32 players. A chosen Leader whose representative list uses cards missing from the engine, or fails `checkDeck`, keeps its slot but its list goes to `unsupported/` exactly as published (no substitute cards), so the pool folder only holds decks the engine can load.
7. **Representative list**: the decklist of the best-placed player with that Leader among used events with >= 32 players, counting only lists legal in Standard on 2026-10-12 (`checkStandardLegality` in `legality.ts`: block icons 2-5 plus the official exception lists, ban list and banned pairs); ties go to the larger event, then the later one, then the player id. Its header records the tournament URL, player, placing/players and date, and the Leader's share and win rate.
8. **Consensus table**: all complete lists of the Leader in used events of any size.
9. **Engine support**: every card id must exist in the engine catalog and the deck must pass `checkDeck` (engine construction rules; Standard legality is already required in step 7). Then 20 games per pair of pool decks with the engine's heuristic bot on both seats (`playGame`, engine `fast`, 1500-command cap). Capability records are charged to the deck of the seat that produced them (or to the deck holding the source card for system records). A command the engine rejects does not end the game: the driver (`arena/game.ts`) counts it and plays the first legal action instead; the game stops as "illegal" only when no legal action is accepted. Each rejection is charged to the deck that sent it, keyed by the card whose prompt it answered (every decision is also tried on a copy of the state to find it); the bot picks among the options the engine offers, so a rejection points at the handling of that card by the engine or our action layer.
