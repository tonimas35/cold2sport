# Resultados medidos

Todas las cifras salen de la arena emparejada (`pnpm opbot arena`):

- **Bloque** = 2 partidas con la misma semilla (mismas cartas para cada asiento), los mismos mazos y
  el mismo jugador empezando; solo se intercambian los bots.
- Los bloques recorren todas las combinaciones ordenadas de mazos (incluidos espejos) y alternan
  quién empieza.
- **Puntuación** = % de partidas ganadas por el candidato (empate = ½). Intervalo del 95 % a partir
  de la varianza entre pares (modelo pentanomial). Elo según el modelo logístico.
- **Pentanomial** `[a/b/c/d/e]` = nº de pares en que el candidato sacó 0, ½, 1, 1½ y 2 puntos.
- SPRT con α = β = 0,05.

Salvo que se diga otra cosa: mazos de prueba del motor (`decks/engine-test`, 6 mazos monocolor
sintéticos), simulación rápida, modelo de valor `logreg-test-v1`.

| # | Fecha | Código | Candidato | Rival | Pares | Pentanomial | Puntuación [IC 95 %] | Elo [IC 95 %] | Notas |
|---|---|---|---|---|---|---|---|---|---|
| E1 | 2026-10-04 | `336230d` | `search:sims=64,h=1,cands=12` | `heuristic` (oráculo) | 144 | 0/0/25/0/119 | **91,3 % [88,2–94,4]** | **+409 [350, 491]** | SPRT(0, 35) decide H1. Nunca pierde las dos partidas de un par. Ningún enfrentamiento por debajo del 50 %. 1º: 88,9 %, 2º: 93,8 %. 213 ms por decisión |
| E2 | 2026-10-04 | `3254f3d` | `search:sims=64,h=1,cands=12` | `aggressive` (oráculo) | 12 | 0/0/4/0/8 | 83,3 % [69,4–97,3] | +280 [142, 620] | SPRT(0, 35) decide H1 tras 12 pares (parada temprana: intervalo ancho). 249 ms por decisión |
| E3 | 2026-10-04 | `3254f3d` | `ismcts:iters=150,h=1,c=0.3` | `search:sims=64` | 8 | 3/0/3/0/2 | 43,8 % [14,8–72,7] | −44 [−304, 170] | Detenido a mano: no concluyente y 2,6× más lento. ISMCTS no mejora aún a la búsqueda plana con este presupuesto |
| E4 | 2026-10-04 | `3254f3d` | `heuristic-honest` | `heuristic` (oráculo) | 360 | 0/0/360/0/0 | 50,0 % | 0 | Las 720 partidas son idénticas por pares: la heurística **no usa** su acceso oráculo, así que la ventaja de E1 no se debe a que el rival haga trampa ni a que deje de hacerla |
| E5 | 2026-10-05 | `3254f3d` | `search:sims=256` | `search:sims=64` | 26 | 4/0/13/0/9 | 59,6 % [46,3–73,0] | +68 [−26, 172] | Detenido a mano para liberar CPU. Tendencia a favor de más cálculo, no significativa. 1,25 s frente a 0,30 s por decisión |
| E8 | 2026-10-05 | `09952de` | `search:sims=64,h=1,cands=12` | `heuristic` (oráculo) | 64 | 7/0/41/0/16 | 57,0 % [49,8–64,2] | +49 [−1, 102] | **Mazos del meta** (Rocks, Luffy OP17-079, Sabo, Shanks), motor **antes** de corregir las cartas de Rocks. 64 pares sin decidir (LLR 1,71). Con Rocks el candidato pierde casi siempre (0 % contra Luffy y Shanks): con cartas rotas el cálculo no compensa. 1,6 s por decisión |
| E6 | 2026-10-05 | `09952de` | `search:sims=64` con `model=value-mlp16-test-v1` | `search:sims=64` (`logreg-test-v1`) | 28 | 0/0/21/0/7 | 62,5 % [54,3–70,7] | **+89 [30, 153]** | Mazos del meta, motor antes de las correcciones. Cortado a los 28 pares por el límite de 2 h de los procesos en segundo plano. La red pequeña (MLP de 16 neuronas, entrenada con los mazos sintéticos) ya mejora la búsqueda en mazos que nunca vio; se repetirá con el motor corregido |

## Calibración de enfrentamientos frente a resultados reales

`pnpm opbot calibrate`: simula cada par de mazos del pool con el mismo bot en los dos lados y lo
compara con los resultados reales entre esos Líderes en los torneos de Limitless (caché local).

| Fecha | Bot | Mazos | Partidas simuladas por par | Correlación con la realidad | Error medio | Mismo favorito |
|---|---|---|---|---|---|---|
| 2026-10-05 | `heuristic` | Rocks, Luffy (OP17-079), Sabo, Shanks | 60 | **−0,24** | 37 puntos | 2 de 5 |
| 2026-10-05 | `heuristic` (muestra real ampliada: 44 torneos, p. ej. 139 partidas Rocks–Sabo) | ídem | 60 | **−0,23** | 33 puntos | 2 de 6 |

Ejemplos: Rocks contra Shanks sale 2 % simulado frente a 75 % real (8 partidas); Rocks contra Sabo,
18 % frente a 71 % (34). La heurística del motor juega muy mal algunos mazos (por ejemplo, con
Rocks usa el efecto de Linlin para darse +1000 a sí misma cuando el ataque va al Líder), así que
**una simulación con bots flojos no sirve para estudiar enfrentamientos**.

Con el bot de búsqueda (`search:sims=32`) en los dos lados, Rocks pierde **30 de 30** contra Luffy
(real: 30 % en 87 partidas). Como el bot de búsqueda juega mucho mejor que la heurística, esto
apunta a **cartas mal implementadas** en alguno de los mazos: hay en marcha una auditoría carta a
carta contra el texto oficial.

Resultados reales (44 torneos Standard de la era OP-17 en Limitless): Rocks gana 67 % a Sabo (139),
30 % a Luffy (87) y 71 % a Shanks (14); Sabo gana 62 % a Luffy (65). Es un triángulo: Rocks > Sabo >
Luffy > Rocks.

Comando E1:

```bash
pnpm opbot arena --candidate "search:sims=64,h=1,cands=12" --baseline heuristic \
  --decks test --blocks 144 --workers 4 --batch 6 --sprt 0,35 --no-stop --engine fast \
  --seed a2 --out out/arena-search64-vs-heuristic-144.jsonl
```

## Enel (OP15-058) antes y después del parche `0003`

Fidelidad del motor, no fuerza de un bot: `heuristic` en los dos lados, 20 partidas por rival
(10 pares), simulación rápida. "Registros" = registros de capacidad (`capabilityHistory`), aquí
siempre `unsupportedCost cost:main:0` de los eventos OP15-074…078.

```bash
bun packages/opbot/src/cli.ts matchup --a decks/meta-op17-postban/OP15-058-enel.txt \
  --b decks/meta-op17-postban/<mazo>.txt --games 20 --agent heuristic
```

| Variante | Victorias de Enel | Registros |
|---|---|---|
| Antes (`41d29d6`) | 23/140 (16 %) | 434, en las 140 partidas |
| Solo el motor (eventos sin DON!! suficientes ya no se juegan; filtro de OP15-077) | 20/140 (14 %) | 0 |
| Solo el agente (`heuristic` elige el máximo en "hasta N DON!!") | 66/140 (47 %) | 216 |
| Motor + agente | 70/140 (50 %) | 0 |
| Final (además, +2000 de OP15-118) | **74/140 (53 %)** | **0** |

Por rival (final, antes entre paréntesis): Pudding 15 (5), Robin 13 (1), Sabo 4 (0), Shanks 5 (0),
Rocks 16 (0), Kaido 20 (17), Luffy OP17-079 1 (0), de 20. Casi toda la mejora viene del agente: el
bot del motor contestaba 0 a "añade/da hasta N DON!!", así que el Líder Enel no hacía nada. El
cambio del agente afecta a **todos** los mazos con esas preguntas: las cifras con `heuristic`
anteriores a este commit (E8, calibración) usaban el comportamiento viejo. Las de Rocks y Luffy
siguen afectadas por sus cartas aún sin corregir.

## Pendientes / en curso

- Corrección de cartas del meta en el motor (parches `0003` y siguientes; ver `vendor/tcg-engines/UPSTREAM.md`).
  Tras ella: repetir E8 y E6 con el motor corregido y recalibrar con el bot de búsqueda.
- E7: ISMCTS con determinización del rival (`opp=1`) contra la búsqueda plana.
- E5 y E2 con tamaño fijo (la parada temprana del SPRT y el corte manual dejan intervalos anchos).

## Cómo leer estos números

- Son resultados **contra bots**, no contra humanos. Que el bot gane al 91 % a la heurística del
  motor dice que la búsqueda funciona, no que juegue como un campeón regional.
- Los mazos de prueba son sintéticos (cartas de OP-01 a OP-04, no legales en Standard). Las cifras
  que importan para estudiar el meta son las de `decks/meta-*`.
- Desde el commit `3254f3d` los experimentos se ejecutan desde un worktree congelado
  (`out/wt`), para que ningún cambio de código se cuele a mitad de una medición.
