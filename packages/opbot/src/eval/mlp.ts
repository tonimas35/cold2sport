/**
 * Tiny multilayer perceptron (one hidden layer, tanh) for the value model,
 * trained with Adam on log-loss. Small enough to evaluate in a few
 * microseconds inside rollouts, and dependency-free.
 */
import type { Dataset, Metrics } from "./train.ts";

export interface MlpWeights {
  readonly hidden: number;
  readonly inputs: number;
  /** hidden x inputs, row-major */
  readonly w1: number[];
  readonly b1: number[];
  readonly w2: number[];
  readonly b2: number;
}

function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

export function mlpPredict(m: MlpWeights, x: ArrayLike<number>, h: Float64Array = new Float64Array(m.hidden)): number {
  const { inputs, hidden, w1, b1, w2 } = m;
  let z = m.b2;
  for (let j = 0; j < hidden; j++) {
    let a = b1[j]!;
    const row = j * inputs;
    for (let i = 0; i < inputs; i++) a += w1[row + i]! * x[i]!;
    const t = Math.tanh(a);
    h[j] = t;
    z += w2[j]! * t;
  }
  return sigmoid(z);
}

export function trainMlp(
  data: Dataset,
  options: { hidden: number; epochs: number; lr: number; l2: number; seed: number; batch: number },
  onEpoch?: (epoch: number, loss: number) => void,
): MlpWeights {
  const inputs = data.x[0]!.length;
  const { hidden } = options;
  let s = options.seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
  const scale = 1 / Math.sqrt(inputs);
  const w1 = Array.from({ length: hidden * inputs }, () => rand() * scale);
  const b1 = new Array<number>(hidden).fill(0);
  const w2 = Array.from({ length: hidden }, () => rand() / Math.sqrt(hidden));
  let b2 = 0;
  const params = [w1, b1, w2];
  const m1 = params.map((p) => new Float64Array(p.length));
  const v1 = params.map((p) => new Float64Array(p.length));
  let mb2 = 0,
    vb2 = 0,
    t = 0;
  const beta1 = 0.9,
    beta2 = 0.999,
    eps = 1e-8;
  const n = data.x.length;
  const order = Array.from({ length: n }, (_, i) => i);
  const h = new Float64Array(hidden);
  for (let epoch = 0; epoch < options.epochs; epoch++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(((rand() + 1) / 2) * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    let lossSum = 0;
    for (let start = 0; start < n; start += options.batch) {
      const g = params.map((p) => new Float64Array(p.length));
      let gb2 = 0;
      const end = Math.min(n, start + options.batch);
      for (let k = start; k < end; k++) {
        const x = data.x[order[k]!]!;
        const y = data.y[order[k]!]!;
        const model = { hidden, inputs, w1, b1, w2, b2 };
        const p = mlpPredict(model, x, h);
        lossSum += -(y * Math.log(Math.max(p, 1e-9)) + (1 - y) * Math.log(Math.max(1 - p, 1e-9)));
        const dz = p - y;
        gb2 += dz;
        for (let j = 0; j < hidden; j++) {
          g[2]![j]! += dz * h[j]!;
          const da = dz * w2[j]! * (1 - h[j]! * h[j]!);
          g[1]![j]! += da;
          const row = j * inputs;
          for (let i = 0; i < inputs; i++) g[0]![row + i]! += da * x[i]!;
        }
      }
      const bs = end - start;
      t++;
      const lrT = (options.lr * Math.sqrt(1 - beta2 ** t)) / (1 - beta1 ** t);
      params.forEach((p, pi) => {
        const gp = g[pi]!,
          mp = m1[pi]!,
          vp = v1[pi]!;
        for (let i = 0; i < p.length; i++) {
          const grad = gp[i]! / bs + (pi === 1 ? 0 : options.l2 * p[i]!);
          mp[i] = beta1 * mp[i]! + (1 - beta1) * grad;
          vp[i] = beta2 * vp[i]! + (1 - beta2) * grad * grad;
          p[i]! -= (lrT * mp[i]!) / (Math.sqrt(vp[i]!) + eps);
        }
      });
      const gb = gb2 / bs;
      mb2 = beta1 * mb2 + (1 - beta1) * gb;
      vb2 = beta2 * vb2 + (1 - beta2) * gb * gb;
      b2 -= (lrT * mb2) / (Math.sqrt(vb2) + eps);
    }
    onEpoch?.(epoch, lossSum / n);
  }
  return { hidden, inputs, w1, b1, w2, b2 };
}

export function mlpMetrics(m: MlpWeights, data: Dataset): Metrics {
  let ll = 0,
    brier = 0,
    correct = 0;
  const h = new Float64Array(m.hidden);
  for (let i = 0; i < data.x.length; i++) {
    const p = Math.min(Math.max(mlpPredict(m, data.x[i]!, h), 1e-9), 1 - 1e-9);
    const y = data.y[i]!;
    ll += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    brier += (p - y) ** 2;
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
  }
  const n = data.x.length;
  return { logLoss: ll / n, brier: brier / n, accuracy: correct / n, n };
}
