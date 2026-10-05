# Guía de uso para entrenar

Todo se lanza desde la raíz del repo con `pnpm opbot <comando>`. La primera vez: `pnpm run setup`.

> Recordatorio: es una herramienta de estudio. **Nunca** la uses durante una partida de torneo.

---

## 1. Analizar una jugada dudosa

Cuando en una partida no sepas qué hacer, apunta la situación y escríbela como posición JSON.
Ejemplos en `examples/positions/` y `examples/puzzles/`.

```jsonc
{
  "toMove": "south",            // quién juega: "south" = tú
  "turn": 7,                     // número de turno global (1, 2, 3...)
  "south": {
    "deck": "../../decks/meta-op17-postban/OP17-079-monkey-d-luffy.txt",  // tu lista (ruta relativa al JSON)
    "life": 3,
    "hand": ["OP17-086", "OP17-119"],          // tu mano completa
    "characters": [
      { "card": "OP17-080", "rested": false, "don": 1 },
      { "card": "OP17-094", "rested": true, "justPlayed": true }
    ],
    "stage": null,
    "trash": ["OP17-081"],
    "leaderDon": 0, "leaderRested": false,
    "activeDon": 5, "restedDon": 0
  },
  "north": {
    "deck": "../../decks/meta-op17-postban/OP17-039-rocks-d-xebec.txt",   // la lista que crees que juega el rival
    "life": 2,
    "handCount": 4,                            // cuántas cartas tiene (no cuáles)
    "hand": [],                                // si sabes alguna (te la enseñó), ponla aquí
    "characters": [{ "card": "OP17-050", "rested": true }],
    "activeDon": 0, "restedDon": 8
  }
}
```

Lo que no conoces (mano del rival, orden de los mazos, vidas boca abajo) se **reparte al azar en
cada simulación** a partir de las listas, quitando las cartas que ya están a la vista.

```bash
pnpm opbot analyze --position mi-posicion.json --worlds 64
```

Cómo leer la salida:

| Columna | Qué significa |
|---|---|
| `win%` | Probabilidad estimada de ganar si haces esa jugada (y luego se juega razonablemente) |
| `95% CI` | Margen de error de esa estimación |
| `vs best` | Cuánto peor es que la mejor jugada, medido sobre los **mismos** mundos simulados (más preciso que restar dos `win%`) |
| `win now` | En qué % de simulaciones ganas **ya, este turno** (letal) |

Consejos:

- Más `--worlds` = más preciso y más lento (64 es un buen punto de partida; 256 para afinar).
- Si dos jugadas tienen un `vs best` cuyo intervalo incluye el 0, la herramienta **no** sabe cuál
  es mejor: las dos son razonables.
- La jugada se analiza "una decisión cada vez": tras la primera acción, el resto del turno lo
  juega un bot. Para planes largos (repartir DON!! entre varios atacantes), analiza también la
  posición siguiente.

## 2. Jugar contra el bot y revisar la partida

```bash
pnpm opbot play --deck decks/meta-op17-postban/OP17-079-monkey-d-luffy.txt \
                --vs decks/meta-op17-postban/OP17-039-rocks-d-xebec.txt \
                --bot "search:sims=64" --first south
```

En cada decisión escribe el número de la jugada, `?` para analizar todas, `h` para ver qué haría el
bot, `v` para ver el tablero y `q` para salir. La partida se guarda en `out/games/`.

Después:

```bash
pnpm opbot review --game out/games/<partida>.json --seat south --worlds 32
```

Marca tus decisiones como imprecisión (≥ 3 puntos de % de victoria perdidos), error (≥ 7) o error
grave (≥ 15), **solo cuando la diferencia es estadísticamente significativa**. Úsalo para encontrar
patrones (¿cuándo haces counter de más?, ¿atacas al personaje equivocado?).

## 3. Enfrentamientos entre mazos: úsalos con cuidado

```bash
pnpm opbot matchup --a A.txt --b B.txt --games 200 --agent "search:sims=32"
```

**Advertencia importante.** Un enfrentamiento simulado es tan bueno como los bots que juegan los dos
mazos. Con la heurística del motor la matriz simulada **no se parece a la realidad** (correlación
−0,24 con resultados reales de torneos; ver `docs/RESULTADOS.md`). Antes de sacar conclusiones:

1. usa el bot de búsqueda (`--agent "search:sims=32"` o más), y
2. comprueba la calibración del pool con resultados reales:

```bash
pnpm opbot calibrate --decks decks/meta-op17-postban --agent "search:sims=32" --games 40
```

Si la correlación con la realidad es baja, trata las cifras como orientativas.

## 4. Probar cambios de cartas

```bash
pnpm opbot tune --deck mi-mazo.txt --swaps "-2xOP17-050,+2xOP16-012" \
                --field decks/meta-op17-postban --games 200
```

Juega las mismas partidas con la lista base y con la variante y te da la diferencia con su
intervalo. Si el intervalo incluye el 0, el cambio no se nota con ese número de partidas.

## 5. Mazos

- Formato de texto (como exporta OPTCGSim): `1xOP17-079` para el Líder y `4xOP17-086` por carta.
- `decks/meta-op17-postban/`: listas reales del meta tras el ban de Mihawk, con su fuente.
  Regenerar: `pnpm opbot meta-decks` (usa la API pública de Limitless, con caché).
- **Comprueba siempre** la tabla "Engine support" del `README.md` de esa carpeta: hay mazos que el
  motor todavía no sabe jugar (cartas que faltan o efectos sin implementar).
