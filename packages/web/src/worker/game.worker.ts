/**
 * The game worker: the engine, the card catalog and the bot run here, off the
 * page's main thread, so the board never freezes while the bot thinks.
 * Protocol: game/protocol.ts; handler: game/host.ts.
 */
import { checkModel, type ValueModel } from "@opbot/core/web";
import valueModel from "@opbot/core/models/value.json";
import { createDeckCatalog } from "../decks/catalog.ts";
import { bundledDeckFiles } from "../decks/bundled.ts";
import { createGameHost } from "../game/host.ts";
import type { ClientMessage, WorkerMessage } from "../game/protocol.ts";

interface WorkerScope {
  postMessage(message: WorkerMessage): void;
  onmessage: ((event: MessageEvent<ClientMessage>) => void) | null;
}
const scope = self as unknown as WorkerScope;

const model = valueModel as unknown as ValueModel;
checkModel(model);

const host = createGameHost({
  catalog: createDeckCatalog(bundledDeckFiles),
  model,
  post: (message) => scope.postMessage(message),
});

scope.onmessage = (event) => {
  host.handle(event.data).catch((error: unknown) => {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  });
};
