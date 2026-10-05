/**
 * Buffers one game's worker messages from the moment it is started, so the
 * game screen (mounted a little later, once the first view exists) gets every
 * view in order: the board animates them one by one and must not miss any.
 */
import type { GameClient } from "../worker/client.ts";
import type { GameSummary, GameView, WorkerMessage } from "../game/protocol.ts";

export interface FeedStart {
  readonly summary: GameSummary;
  readonly firstView: GameView;
}

export class GameFeed {
  private readonly buffer: WorkerMessage[] = [];
  private listener: ((message: WorkerMessage) => void) | null = null;
  private readonly off: () => void;
  private summary: GameSummary | null = null;
  private start: FeedStart | null = null;

  constructor(
    client: GameClient,
    private readonly handlers: { onStart(start: FeedStart): void; onError(message: string): void },
  ) {
    this.off = client.on((message) => this.receive(message));
  }

  private receive(message: WorkerMessage): void {
    if (!this.start) {
      if (message.type === "started") this.summary = message.summary;
      else if (message.type === "error") this.handlers.onError(message.message);
      else if (message.type === "view" && this.summary) {
        this.start = { summary: this.summary, firstView: message.view };
        this.handlers.onStart(this.start);
      }
      return;
    }
    if (this.listener) this.listener(message);
    else this.buffer.push(message);
  }

  /** Delivers the buffered messages, then the live ones. */
  connect(listener: (message: WorkerMessage) => void): () => void {
    this.listener = listener;
    for (const message of this.buffer.splice(0)) listener(message);
    return () => {
      if (this.listener === listener) this.listener = null;
    };
  }

  dispose(): void {
    this.off();
    this.listener = null;
  }
}
