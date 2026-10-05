/**
 * CPU slow-down for the think-time measurement.
 *
 * Chrome DevTools' CPU throttling (`Emulation.setCPUThrottlingRate`) only
 * slows the page's main thread: measured here, a busy loop in a Web Worker
 * ran at full speed with it on (main thread 162 -> 655 ms, worker 522 ->
 * 579 ms), and our bot runs in a worker. To approximate a phone that is N
 * times slower for the bot too, `ProcessThrottle` pauses Chromium's renderer
 * processes (the page and its workers) with SIGSTOP/SIGCONT so that they run
 * 1/N of the time: the same duty-cycle idea DevTools applies to the main
 * thread. Linux/macOS only; it pauses every Chromium renderer of this user,
 * so run it with no other Chromium open (true in CI and in the dev container).
 */
import { execFileSync } from "node:child_process";

/** PIDs of Playwright's Chromium renderer processes. */
export function rendererPids(): number[] {
  let out = "";
  try {
    out = execFileSync("pgrep", ["-f", "--", "--type=renderer"], { encoding: "utf8" });
  } catch {
    return []; // pgrep exits 1 when nothing matches
  }
  return out
    .trim()
    .split("\n")
    .map(Number)
    .filter((pid) => Number.isInteger(pid) && pid !== process.pid);
}

export class ProcessThrottle {
  private timer: ReturnType<typeof setInterval> | null = null;
  private refresh: ReturnType<typeof setInterval> | null = null;
  private pids: number[] = [];

  /** `rate` 4 = run 25 ms of every 100 ms. */
  constructor(
    private readonly rate: number,
    private readonly periodMs = 100,
  ) {}

  start(): void {
    const runMs = this.periodMs / this.rate;
    this.pids = rendererPids();
    // pgrep is slow-ish: look for new renderer processes every two seconds.
    this.refresh = setInterval(() => (this.pids = rendererPids()), 2000);
    this.timer = setInterval(() => {
      const pids = this.pids;
      this.signal(pids, "SIGSTOP");
      setTimeout(() => this.signal(pids, "SIGCONT"), this.periodMs - runMs);
    }, this.periodMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.refresh) clearInterval(this.refresh);
    this.timer = this.refresh = null;
    this.signal(this.pids, "SIGCONT");
    // A SIGSTOP scheduled just before stop() is undone by the pending SIGCONT;
    // send one more after it for good measure.
    setTimeout(() => this.signal(rendererPids(), "SIGCONT"), this.periodMs);
  }

  private signal(pids: readonly number[], signal: NodeJS.Signals): void {
    for (const pid of pids) {
      try {
        process.kill(pid, signal);
      } catch {
        // The process may have exited.
      }
    }
  }
}
