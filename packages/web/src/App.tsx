/**
 * Two screens, no router: the setup screen (decks, who starts, bot level) and
 * the game. A single page with in-memory state works from any sub-path of a
 * static host, with no rewrites and nothing in the URL to break.
 */
import { useCallback, useEffect, useState } from "react";
import type { DeckOption, LevelInfo, StartConfig } from "./game/protocol.ts";
import { GameFeed, type FeedStart } from "./ui/feed.ts";
import { GameScreen } from "./ui/GameScreen.tsx";
import { SetupScreen } from "./ui/SetupScreen.tsx";
import { createBrowserClient, type GameClient } from "./worker/client.ts";

type Phase =
  | { readonly kind: "setup" }
  | { readonly kind: "starting"; readonly feed: GameFeed }
  | { readonly kind: "playing"; readonly feed: GameFeed; readonly start: FeedStart };

export function App() {
  const [client] = useState<GameClient>(() => createBrowserClient());
  const [catalog, setCatalog] = useState<{ decks: readonly DeckOption[]; levels: readonly LevelInfo[] } | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [lastConfig, setLastConfig] = useState<StartConfig | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const off = client.on((message) => {
      if (message.type === "ready") setCatalog({ decks: message.decks, levels: message.levels });
    });
    client.start();
    return off;
  }, [client]);

  useEffect(() => {
    document.body.classList.add("one-piece-active");
    return () => document.body.classList.remove("one-piece-active");
  }, []);

  const startGame = useCallback(
    (config: StartConfig) => {
      setStartError(null);
      setLastConfig(config);
      const feed = new GameFeed(client, {
        onStart: (start) => setPhase({ kind: "playing", feed, start }),
        onError: (message) => {
          feed.dispose();
          setStartError(message);
          setPhase({ kind: "setup" });
        },
      });
      setPhase({ kind: "starting", feed });
      client.send({ type: "start", config });
    },
    [client],
  );

  const leaveGame = useCallback(
    (options: { restartWorker: boolean }) => {
      if (phase.kind !== "setup") phase.feed.dispose();
      if (options.restartWorker) client.restart();
      else client.send({ type: "abandon" });
      setPhase({ kind: "setup" });
    },
    [client, phase],
  );

  if (phase.kind === "playing") {
    return (
      <div className="one-piece-root">
        <GameScreen
          key={phase.start.summary.seed}
          client={client}
          feed={phase.feed}
          start={phase.start}
          onExit={leaveGame}
          onRematch={(options) => {
            if (!lastConfig) return;
            phase.feed.dispose();
            if (options.restartWorker) client.restart();
            // Same decks and level, new shuffles (a fixed seed is only for tests).
            const { seed: _seed, ...config } = lastConfig;
            startGame(config);
          }}
        />
      </div>
    );
  }

  return (
    <SetupScreen
      client={client}
      catalog={catalog}
      starting={phase.kind === "starting"}
      error={startError}
      onStart={startGame}
    />
  );
}
