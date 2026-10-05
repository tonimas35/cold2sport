// Compares value models on the held-out games of a self-play file (same 1-in-5 split
// by game as train-value). Usage: DATA=out/selfplay-meta1.jsonl bun packages/opbot/scripts/eval-models.ts <model.json>...
import { readFileSync } from "node:fs";
import { predictFeatures, HANDCRAFTED_MODEL, type ValueModel } from "../src/eval/value.ts";
const rows = readFileSync(process.env.DATA ?? "out/selfplay-meta1.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { game: string; f: number[]; y: number });
const isTest = (game: string) => { let h = 0; for (let i = 0; i < game.length; i++) h = (h * 31 + game.charCodeAt(i)) >>> 0; return h % 5 === 0; };
const test = rows.filter((r) => isTest(r.game));
const models: Array<[string, ValueModel]> = [["handcrafted", HANDCRAFTED_MODEL]];
for (const f of process.argv.slice(2)) models.push([f.split("/").pop()!, JSON.parse(readFileSync(f, "utf8"))]);
for (const [name, m] of models) {
  let ll = 0, acc = 0, brier = 0;
  for (const r of test) {
    const p = Math.min(1 - 1e-6, Math.max(1e-6, predictFeatures(m, Float64Array.from(r.f))));
    ll += -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); brier += (p - r.y) ** 2; acc += (p > 0.5) === (r.y === 1) ? 1 : 0;
  }
  console.log(`${name.padEnd(32)} logloss ${(ll / test.length).toFixed(4)} brier ${(brier / test.length).toFixed(4)} acc ${(acc / test.length).toFixed(4)} (n=${test.length})`);
}
