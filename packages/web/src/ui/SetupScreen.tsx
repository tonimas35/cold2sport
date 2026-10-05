/**
 * Before the game: your deck, the bot's deck, who goes first and the bot's
 * level. Pasted lists are checked in the worker with @opbot/core's parser and
 * construction rules as you type. The last choices are remembered.
 */
import {
  Alert,
  Button,
  Container,
  Group,
  NativeSelect,
  Paper,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type {
  BotLevel,
  DeckCheckResult,
  DeckChoice,
  DeckOption,
  FirstPlayerChoice,
  LevelInfo,
  StartConfig,
} from "../game/protocol.ts";
import type { GameClient } from "../worker/client.ts";
import { CardArt } from "./CardTile.tsx";
import { useSettings } from "./settings.tsx";
import setup from "./setup.module.css";

const PASTE = "paste";
const RANDOM_META = "random-meta";
const STORAGE_KEY = "opbot.web.setup";

interface Pick {
  /** A catalog id, PASTE or (bot only) RANDOM_META. */
  readonly value: string;
  readonly text: string;
  readonly name: string;
}

interface Stored {
  readonly human: Pick;
  readonly bot: Pick;
  readonly first: FirstPlayerChoice;
  readonly level: BotLevel;
}

function loadStored(): Partial<Stored> {
  try {
    return (JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "null") as Partial<Stored> | null) ?? {};
  } catch {
    return {};
  }
}

function pickToChoice(pick: Pick): DeckChoice {
  return pick.value === PASTE ? { kind: "text", text: pick.text, name: pick.name || "pegado" } : { kind: "catalog", id: pick.value };
}

/** A meta deck drawn with probability proportional to its share of the meta. */
export function drawMetaDeck(options: readonly DeckOption[], random: () => number = Math.random): DeckOption | undefined {
  const meta = options.filter((o) => o.group === "meta" && o.share);
  const total = meta.reduce((s, o) => s + (o.share ?? 0), 0);
  let x = random() * total;
  for (const option of meta) {
    x -= option.share ?? 0;
    if (x <= 0) return option;
  }
  return meta.at(-1);
}

function percent(x: number | null): string {
  return x === null ? "" : `${(x * 100).toFixed(1).replace(".", ",")} %`;
}

const COLORS: Record<string, string> = {
  red: "rojo",
  green: "verde",
  blue: "azul",
  purple: "morado",
  black: "negro",
  yellow: "amarillo",
};

function DeckPicker({
  label,
  testId,
  options,
  pick,
  allowRandom,
  check,
  onChange,
}: {
  readonly label: string;
  readonly testId: string;
  readonly options: readonly DeckOption[];
  readonly pick: Pick;
  readonly allowRandom: boolean;
  readonly check: DeckCheckResult | "pending" | null;
  readonly onChange: (pick: Pick) => void;
}) {
  const data = useMemo(
    () => [
      {
        group: "Meta post-ban (OP-17, Limitless)",
        items: [
          ...(allowRandom ? [{ value: RANDOM_META, label: "Al azar según la cuota del meta" }] : []),
          ...options
            .filter((o) => o.group === "meta")
            .map((o) => ({ value: o.id, label: `${o.leaderName} (${o.leaderId}) · ${percent(o.share)}` })),
        ],
      },
      {
        group: "Mazos de prueba del motor (bloque 1, no Standard)",
        items: options.filter((o) => o.group === "test").map((o) => ({ value: o.id, label: `${o.name} · ${o.leaderName}` })),
      },
      { group: "Otro", items: [{ value: PASTE, label: "Pegar una lista (formato OPTCGSim)…" }] },
    ],
    [allowRandom, options],
  );
  const selected = options.find((o) => o.id === pick.value);
  return (
    <Paper className={setup.deck} withBorder radius="md" p="md" data-testid={testId}>
      <div className={setup.deckRow}>
        <div className={setup.leader}>
          {selected ? <CardArt card={{ imageUrl: selected.leaderImageUrl, name: selected.leaderName }} label={selected.leaderName} /> : null}
          {!selected ? <span className={setup.leaderPlaceholder}>{pick.value === RANDOM_META ? "?" : "Lista"}</span> : null}
        </div>
        <Stack gap={6} className={setup.deckControls}>
          <NativeSelect
            label={label}
            data={data}
            value={pick.value}
            onChange={(event) => onChange({ ...pick, value: event.currentTarget.value })}
            data-testid={`${testId}-select`}
          />
          {selected ? (
            <Text size="xs" c="dimmed">
              {selected.colors.map((c) => COLORS[c] ?? c).join(" y ")}
              {selected.group === "meta" && selected.winRate !== null ? ` · ${percent(selected.winRate)} de victorias en torneos` : ""}
            </Text>
          ) : null}
        </Stack>
      </div>
      {pick.value === PASTE ? (
        <Stack gap={6} mt="sm">
          <Textarea
            autosize
            minRows={4}
            maxRows={10}
            placeholder={"1xOP17-079\n4xOP17-086\n4xOP17-094\n…"}
            value={pick.text}
            onChange={(event) => onChange({ ...pick, text: event.currentTarget.value })}
            classNames={{ input: setup.mono }}
            data-testid={`${testId}-text`}
            aria-label={`${label}: lista`}
          />
          <TextInput
            size="xs"
            placeholder="Nombre del mazo (opcional)"
            value={pick.name}
            onChange={(event) => onChange({ ...pick, name: event.currentTarget.value })}
          />
          {check === "pending" ? <Text size="xs">Comprobando…</Text> : null}
          {check && check !== "pending" && check.ok && check.deck ? (
            <Text size="sm" c="teal.8" data-testid={`${testId}-ok`}>
              Líder {check.deck.leaderName} ({check.deck.leaderId}) · {check.deck.cards} cartas
            </Text>
          ) : null}
          {check && check !== "pending" && check.errors.length ? (
            <Alert color="red" variant="light" data-testid={`${testId}-errors`} title="La lista tiene problemas">
              <ul className={setup.list}>
                {check.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {check && check !== "pending" && check.warnings.length ? (
            <Alert color="yellow" variant="light">
              <ul className={setup.list}>
                {check.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  );
}

function useDeckCheck(client: GameClient, pick: Pick): DeckCheckResult | "pending" | null {
  const [result, setResult] = useState<DeckCheckResult | "pending" | null>(null);
  useEffect(() => {
    if (pick.value !== PASTE) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setResult("pending");
    const timer = window.setTimeout(() => {
      void client.checkDeck(pickToChoice(pick)).then((r) => {
        if (!cancelled) setResult(r);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, pick]);
  return result;
}

export function SetupScreen({
  client,
  catalog,
  starting,
  error,
  onStart,
}: {
  readonly client: GameClient;
  readonly catalog: { decks: readonly DeckOption[]; levels: readonly LevelInfo[] } | null;
  readonly starting: boolean;
  readonly error: string | null;
  readonly onStart: (config: StartConfig) => void;
}) {
  const stored = useMemo(loadStored, []);
  const { settings, update } = useSettings();
  const [human, setHuman] = useState<Pick>(stored.human ?? { value: "meta:OP17-079-monkey-d-luffy", text: "", name: "" });
  const [bot, setBot] = useState<Pick>(stored.bot ?? { value: "meta:OP17-039-rocks-d-xebec", text: "", name: "" });
  const [first, setFirst] = useState<FirstPlayerChoice>(stored.first ?? "random");
  const [level, setLevel] = useState<BotLevel>(stored.level ?? "normal");
  const humanCheck = useDeckCheck(client, human);
  const botCheck = useDeckCheck(client, bot);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ human, bot, first, level } satisfies Stored));
    } catch {
      // Private browsing: nothing to remember.
    }
  }, [human, bot, first, level]);

  const decks = catalog?.decks ?? [];
  const valid = (pick: Pick, check: DeckCheckResult | "pending" | null) =>
    pick.value === RANDOM_META || (pick.value === PASTE ? check !== null && check !== "pending" && check.ok : decks.some((d) => d.id === pick.value));
  const canStart = Boolean(catalog) && !starting && valid(human, humanCheck) && valid(bot, botCheck);

  const start = () => {
    const botPick = bot.value === RANDOM_META ? { ...bot, value: drawMetaDeck(decks)?.id ?? decks[0]!.id } : bot;
    // `?seed=...` replays the same deal (reproducing a game, measurements).
    const seed = new URLSearchParams(globalThis.location?.search ?? "").get("seed");
    onStart({ human: pickToChoice(human), bot: pickToChoice(botPick), first, level, ...(seed && { seed }) });
  };

  return (
    <main className={setup.page} data-testid="setup-screen">
      <Container size={760} px="md" py="lg">
        <Stack gap="lg">
          <header className={setup.header}>
            <p className={setup.eyebrow}>One Piece Card Game</p>
            <Title order={1} className={setup.title}>
              Entrena contra el bot
            </Title>
            <Text c="dimmed" size="sm">
              Juega una partida completa contra el bot de opbot, en el móvil o en el ordenador. El bot es honesto: no ve tu mano, ni las
              Vidas, ni el orden de los mazos.
            </Text>
          </header>

          {!catalog ? (
            <Text data-testid="loading">Cargando el motor y las cartas…</Text>
          ) : (
            <>
              <DeckPicker
                label="Tu mazo"
                testId="human-deck"
                options={decks}
                pick={human}
                allowRandom={false}
                check={humanCheck}
                onChange={setHuman}
              />
              <DeckPicker
                label="Mazo del bot"
                testId="bot-deck"
                options={decks}
                pick={bot}
                allowRandom
                check={botCheck}
                onChange={setBot}
              />

              <Paper withBorder radius="md" p="md">
                <Text fw={700} size="sm" mb={6}>
                  ¿Quién empieza?
                </Text>
                <SegmentedControl
                  fullWidth
                  value={first}
                  onChange={(value) => setFirst(value as FirstPlayerChoice)}
                  data={[
                    { value: "human", label: "Yo" },
                    { value: "bot", label: "El bot" },
                    { value: "random", label: "Al azar" },
                  ]}
                  data-testid="first-player"
                />
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Radio.Group value={level} onChange={(value) => setLevel(value as BotLevel)} label="Nivel del bot">
                  <Stack gap={8} mt={8}>
                    {catalog.levels.map((l) => (
                      <Radio.Card key={l.id} value={l.id} className={setup.level} data-testid={`level-${l.id}`} radius="md">
                        <Group wrap="nowrap" align="flex-start" gap="sm">
                          <Radio.Indicator />
                          <div>
                            <Text fw={800}>{l.label}</Text>
                            <Text size="sm" c="dimmed">
                              {l.description}
                            </Text>
                          </div>
                        </Group>
                      </Radio.Card>
                    ))}
                  </Stack>
                </Radio.Group>
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Text fw={700} size="sm" mb={6}>
                  Animaciones
                </Text>
                <SegmentedControl
                  fullWidth
                  value={settings.animationSpeed}
                  onChange={(value) => update({ animationSpeed: value as typeof settings.animationSpeed })}
                  data={[
                    { value: "normal", label: "Normales" },
                    { value: "fast", label: "Rápidas" },
                    { value: "off", label: "No" },
                  ]}
                />
              </Paper>

              {error ? (
                <Alert color="red" title="No se pudo empezar">
                  {error}
                </Alert>
              ) : null}

              <Button size="lg" color="red.9" onClick={start} disabled={!canStart} loading={starting} data-testid="start-game">
                Jugar
              </Button>
            </>
          )}

          <footer className={setup.footer}>
            <p>
              Al terminar puedes descargar la partida y revisarla aquí mismo o con <code>pnpm opbot review</code>. Durante la partida no hay
              ayudas: es un rival para practicar, no un asistente.
            </p>
            <p>
              Motor de reglas y tablero:{" "}
              <a href="https://github.com/TheCardGoat/tcg-engines" target="_blank" rel="noreferrer">
                TheCardGoat/tcg-engines
              </a>{" "}
              (MIT). Imágenes de las cartas cargadas desde optcgapi.com. One Piece Card Game es de Bandai; uso privado de práctica.
            </p>
          </footer>
        </Stack>
      </Container>
    </main>
  );
}
