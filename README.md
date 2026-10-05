# One Piece TCG: bot de análisis

Herramienta personal para **entrenar y analizar en casa** partidas del One Piece Card Game: evalúa
posiciones, simula enfrentamientos entre mazos y juega con un bot de búsqueda que solo usa la
información que tendría un jugador. **No es para usar durante torneos.**

- **Guía para entrenar con la herramienta: [`docs/GUIA.md`](docs/GUIA.md)**
- Plan, estado y decisiones: [`PLAN.md`](PLAN.md)
- Cómo funciona el motor de reglas y qué hemos cambiado: [`docs/NOTAS_MOTOR.md`](docs/NOTAS_MOTOR.md)
- Resultados medidos: [`docs/RESULTADOS.md`](docs/RESULTADOS.md)
- Investigación (bots existentes, estado del arte, fuentes de datos, formato): [`docs/INVESTIGACION.md`](docs/INVESTIGACION.md)

Motor de reglas: [TheCardGoat/tcg-engines](https://github.com/TheCardGoat/tcg-engines) (MIT),
vendorizado en `vendor/tcg-engines` con su licencia.

## Instalación

Requisitos: Node 24, pnpm 10.33 y [Bun](https://bun.sh).

```bash
pnpm run setup
pnpm run check
```

En sesiones de Claude Code en la nube el hook `.claude/hooks/session-start.sh` lo instala todo solo.

## Uso

Todos los comandos se lanzan desde la raíz con `pnpm opbot <comando>` (equivale a
`bun packages/opbot/src/cli.ts <comando>`).

### Analizar una posición

Describe la situación en un JSON (ver `examples/positions/ejemplo-luffy-vs-rocks.json` y la guía): vidas, mano,
personajes, DON!!, papelera y la lista de cada mazo. Lo que no conoces (mano rival, mazos, vidas) se
reparte al azar en cada simulación.

```bash
pnpm opbot analyze --position examples/positions/ejemplo-letal.json --worlds 64
```

Devuelve cada jugada posible con su % de victoria, intervalo de confianza, diferencia con la mejor y
probabilidad de ganar ya este turno.

### Enfrentamiento entre dos mazos

```bash
pnpm opbot matchup --a decks/engine-test/red-aggro.txt --b decks/engine-test/blue-control.txt --games 200
```

### Comparar bots (arena emparejada con SPRT)

```bash
pnpm opbot arena --candidate "search:sims=64" --baseline heuristic --decks decks/engine-test --blocks 200
```

Agentes disponibles: `heuristic`, `heuristic-honest`, `aggressive`, `random`,
`policy`, `policy-honest`, `search:sims=N,h=1`, `ismcts:iters=N,h=1`.

- `heuristic` es el bot del motor sin tocar (la referencia "bot existente").
- `policy` es ese mismo bot con correcciones puntuales donde desperdicia cartas
  (`packages/opbot/src/agents/policy.ts`): cantidades "hasta N" al máximo, −X de poder y
  eliminación sobre las cartas rivales correctas, [Trigger] "Juega esta carta" siempre, no jugar
  Eventos ni pagar costes opcionales cuyo efecto no haría nada, "elige una" con una jugada de
  anticipación y el modelo de valor, y reglas para usar bien el DON!! (qué DON!! se devuelven en un
  DON!! −X, a quién se dan, cuándo compensa un DON!! −X y en qué orden van eventos, ataques y
  recargas de DON!!). Ve todo, como `heuristic`; `policy-honest` decide sobre un estado
  determinizado. `policy:tempo=0` es la misma política sin las reglas de DON!!, para comparar.
- La búsqueda usa `policy` en sus rollouts y contesta las cantidades "añade/da hasta N DON!!" con
  la regla de la política, sin simular. `search:...,rollout=policy0` es la búsqueda tal como era
  antes de las reglas de DON!! y `search:...,rollout=engine` usa la política más antigua (la
  heurística del motor con dos arreglos).

### Otros

```bash
pnpm opbot bench                       # velocidad del motor
pnpm opbot selfplay --games 20000      # datos para el modelo de valor
pnpm opbot train-value --data out/selfplay.jsonl
pnpm opbot meta-decks                  # pool del meta desde la API de Limitless
pnpm opbot catalog-check               # catálogo del motor frente a la lista oficial (docs/CATALOGO.md)
```

## Formato de mazos

Texto, una línea por carta, como exporta OPTCGSim:

```
# source: https://...
1xOP17-039
4xOP17-040
...
```
