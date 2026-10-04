/**
 * L2-regularized logistic regression fitted with Newton's method (IRLS).
 * Small feature count, so we solve the normal equations directly.
 */
export interface Dataset {
  readonly x: Float64Array[];
  readonly y: Float64Array; // 0/1
}

function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const p = m[col]![col]!;
    if (Math.abs(p) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r]![col]! / p;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m[r]![c]! -= factor * m[col]![c]!;
    }
  }
  return m.map((row, i) => (Math.abs(row[i]!) < 1e-12 ? 0 : row[n]! / row[i]!));
}

function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

export function fitLogistic(data: Dataset, l2 = 1.0, iterations = 25): number[] {
  const d = data.x[0]!.length;
  let w = new Array<number>(d).fill(0);
  for (let it = 0; it < iterations; it++) {
    const grad = new Array<number>(d).fill(0);
    const hess = Array.from({ length: d }, () => new Array<number>(d).fill(0));
    for (let i = 0; i < data.x.length; i++) {
      const x = data.x[i]!;
      let z = 0;
      for (let j = 0; j < d; j++) z += w[j]! * x[j]!;
      const p = sigmoid(z);
      const err = p - data.y[i]!;
      const s = p * (1 - p);
      for (let j = 0; j < d; j++) {
        const xj = x[j]!;
        if (xj === 0) continue;
        grad[j]! += err * xj;
        const sx = s * xj;
        const row = hess[j]!;
        for (let k = j; k < d; k++) row[k]! += sx * x[k]!;
      }
    }
    for (let j = 0; j < d; j++) {
      for (let k = 0; k < j; k++) hess[j]![k] = hess[k]![j]!;
      // Do not shrink the bias (index 0).
      if (j > 0) {
        grad[j]! += l2 * w[j]!;
        hess[j]![j]! += l2;
      } else {
        hess[j]![j]! += 1e-6;
      }
    }
    const step = solve(hess, grad);
    let change = 0;
    w = w.map((wj, j) => {
      change = Math.max(change, Math.abs(step[j]!));
      return wj - step[j]!;
    });
    if (change < 1e-7) break;
  }
  return w;
}

export interface Metrics {
  logLoss: number;
  brier: number;
  accuracy: number;
  n: number;
}

export function metrics(w: readonly number[], data: Dataset): Metrics {
  let ll = 0,
    brier = 0,
    correct = 0;
  for (let i = 0; i < data.x.length; i++) {
    const x = data.x[i]!;
    let z = 0;
    for (let j = 0; j < x.length; j++) z += w[j]! * x[j]!;
    const p = Math.min(Math.max(sigmoid(z), 1e-9), 1 - 1e-9);
    const y = data.y[i]!;
    ll += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    brier += (p - y) ** 2;
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
  }
  const n = data.x.length;
  return { logLoss: ll / n, brier: brier / n, accuracy: correct / n, n };
}
