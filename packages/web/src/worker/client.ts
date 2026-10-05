/**
 * The page's side of the worker protocol: starts the game worker, forwards
 * commands and fans the worker's messages out to the screens.
 */
import type { ClientMessage, DeckCheckResult, DeckChoice, WorkerMessage } from "../game/protocol.ts";

export type Listener = (message: WorkerMessage) => void;

export class GameClient {
  private worker: Worker | null = null;
  private readonly listeners = new Set<Listener>();
  private nextRequestId = 1;

  constructor(private readonly createWorker: () => Worker) {}

  /** Starts (or restarts) the worker and asks for the deck catalog. */
  start(): void {
    this.worker?.terminate();
    const worker = this.createWorker();
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.emit(event.data);
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.emit({ type: "error", message: event.message || "Error en el worker del juego." });
    };
    this.worker = worker;
    this.send({ type: "init" });
  }

  /** A long post-game review cannot be interrupted from inside: restart the worker instead. */
  restart(): void {
    this.start();
  }

  send(message: ClientMessage): void {
    this.worker?.postMessage(message);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  checkDeck(choice: DeckChoice): Promise<DeckCheckResult> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve) => {
      const off = this.on((message) => {
        if (message.type === "deckChecked" && message.requestId === requestId) {
          off();
          resolve(message.result);
        }
      });
      this.send({ type: "checkDeck", requestId, choice });
    });
  }

  private emit(message: WorkerMessage): void {
    for (const listener of [...this.listeners]) listener(message);
  }
}

export function createBrowserClient(): GameClient {
  return new GameClient(() => new Worker(new URL("./game.worker.ts", import.meta.url), { type: "module", name: "opbot-game" }));
}
