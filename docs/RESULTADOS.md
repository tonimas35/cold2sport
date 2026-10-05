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
| E9 | 2026-10-05 | `3c13662` | `policy` (oráculo) | `heuristic` (oráculo) | 128 | 2/0/91/0/35 | **62,9 % [58,8–67,0]** | **+92 [62, 123]** | **Mazos del meta** (los 8 del pool), motor de este commit (antes de las correcciones de cartas en curso). SPRT(0, 35) decide H1 a los 32 pares; con `--no-stop` se completa un ciclo entero (64 emparejamientos × quién empieza). Mejora con 7 de los 8 mazos e iguala con Sabo (detalle abajo). 0 comandos rechazados. 1º: 65,6 %, 2º: 60,2 %. 2,6 ms por decisión (heurística: 2,3) |
| E10 | 2026-10-05 | `3c13662` | `search:sims=32,h=1,cands=12` (rollouts con `policy`) | `search:sims=32,h=1,cands=12,rollout=engine` (rollouts anteriores) | 88 | 5/0/67/0/16 | **56,3 % [51,3–61,2]** | **+44 [9, 79]** | Mazos del meta, el mismo motor en los dos lados (las correcciones de cartas en curso moverán las cifras absolutas, no la comparación). Cortado a los ~95 min en una máquina compartida: 88 bloques (los 64 emparejamientos con sur empezando y 24 con norte). SPRT(0, 35): LLR 2,96, decide H1 (ya había cruzado a los 48 pares, 3,07, y bajó). 0 comandos rechazados. 1º: 54,5 %, 2º: 58,0 %. 478 ms por decisión frente a 455 ms |
| E11 | 2026-10-05 | `4451fe9` | `search:sims=32,h=1,cands=12` (rollouts `policy`) | `heuristic` (oráculo, el bot del motor sin cambios) | 162 | 5/0/83/0/74 | **71,3 % [67,0–75,6]** | **+158 [123, 196]** | **Mazos del meta, 9 mazos, motor con los parches 0001–0007** (Rocks, Luffy, Luffy & Ace y Enel ya corregidos). Ciclo completo con `--no-stop` (81 emparejamientos × quién empieza); el SPRT ya decidía H1 a los 18 pares. 1º: 71,6 %, 2º: 71,0 %. 181 ms por decisión. Gana con los 9 mazos (detalle abajo) |
| E12 | 2026-10-05 | `4451fe9` + modelos de `3acc997` | `search:sims=32,h=1,cands=12,model=value-mlp16-meta-v1.json` | `search:sims=32,h=1,cands=12` (modelo `logreg-test-v1`, el anterior por defecto) | 162 | 5/0/89/0/68 | **69,4 % [65,2–73,7]** | **+143 [109, 179]** | **Modelo de valor entrenado con partidas del meta** (MLP de 16 neuronas, 6.000 partidas de self-play con los 9 mazos) contra el entrenado con mazos sintéticos. 9 mazos, ciclo completo con `--no-stop`; SPRT(0, 35) H1 (LLR 18,4). Mejor con 8 mazos e igual con Enel (detalle abajo). 205 ms por decisión frente a 198. **Pasa a ser el modelo por defecto** |
| E7 | 2026-10-05 | `4451fe9` + modelo `mlp16-meta-v1` | `ismcts:iters=64,h=1,opp=1` | `search:sims=32,h=1,cands=12` | 156 | 14/1/118/0/23 | 52,7 % [48,9–56,5] | +19 [−8, 46] | 9 mazos del meta, mismo modelo de valor en los dos. **No concluyente** (LLR 0,28): cortado a los 156 de 162 pares por el límite de 2,5 h de los procesos en segundo plano. ISMCTS gasta el doble por decisión (387 ms frente a 195 ms) y aun así no se separa de la búsqueda plana: **seguimos con la búsqueda plana** |
| E13 | 2026-10-05 | `793d118` | `policy` (con las reglas de DON!!) | `policy:tempo=0` (la `policy` anterior, decisión por decisión) | 162 | 2/0/126/0/34 | **59,9 % [56,6–63,2]** | **+70 [46, 94]** | **El DON!! como recurso** (reglas A–D, `docs/NOTAS_MOTOR.md` §6). 9 mazos del meta, motor con los parches 0001–0013, ciclo completo con `--no-stop`; SPRT(0, 35) H1 (LLR 13,1; ya a los 48 pares). **Mejora con los 9 mazos** (detalle abajo; Enel +61 puntos, Kaido +14). 0 comandos rechazados. 1º: 61,1 %, 2º: 58,6 %. 1,7 ms por decisión frente a 1,6 |
| E14 | 2026-10-05 | `793d118` + modelo `mlp16-meta-v1` | `search:sims=32,h=1,cands=12` (rollouts con las reglas de DON!! y cantidades "hasta N" por regla) | `search:sims=32,h=1,cands=12,rollout=policy0` (la búsqueda anterior, decisión por decisión) | 162 | 5/0/122/0/35 | **59,3 % [55,7–62,8]** | **+65 [40, 91]** | Mismo modelo de valor en los dos (el de `models/value.json`). 9 mazos del meta, motor 0001–0013, ciclo completo con `--no-stop`; SPRT(0, 35) H1 (LLR 10,3; ya a los 32 pares). **Mejora con los 9 mazos** (detalle abajo). 0 comandos rechazados. 1º: 63,6 %, 2º: 54,9 %. 209 ms por decisión frente a 205; ~76 min con 2 procesos |
| E15 | 2026-10-05 | `cc5349d` + modelos de `21725d8` | `search:sims=32,h=1,cands=12,model=value-mlp16-meta-v2.json` | `search:sims=32,h=1,cands=12,model=value-mlp16-meta-v1.json` (el modelo por defecto) | 162 | 18/0/118/0/26 | 52,5 % [48,5–56,5] | +17 [−11, 45] | Modelo de valor reentrenado con 6.000 partidas más de self-play jugadas con las reglas de DON!! (v1 + nuevas, 262.984 posiciones): predice mejor (log-loss en partidas nuevas 0,486 frente a 0,498; en las antiguas 0,427 frente a 0,432), pero en la arena **no concluye** (LLR −0,05). Mejor con Kaido (39 % frente a 25 %) y Luffy (75 % frente a 58 %), peor con Luffy & Ace (39 % frente a 50 %), 36 partidas por mazo. **El modelo por defecto sigue siendo `mlp16-meta-v1`**. 202 ms por decisión frente a 200 |

## Calibración de enfrentamientos frente a resultados reales

`pnpm opbot calibrate`: simula cada par de mazos del pool con el mismo bot en los dos lados y lo
compara con los resultados reales entre esos Líderes en los torneos de Limitless (caché local).

| Fecha | Bot | Mazos | Partidas simuladas por par | Correlación con la realidad | Error medio | Mismo favorito |
|---|---|---|---|---|---|---|
| 2026-10-05 | `heuristic` | Rocks, Luffy (OP17-079), Sabo, Shanks | 60 | **−0,24** | 37 puntos | 2 de 5 |
| 2026-10-05 | `heuristic` (muestra real ampliada: 44 torneos, p. ej. 139 partidas Rocks–Sabo) | ídem | 60 | **−0,23** | 33 puntos | 2 de 6 |
| 2026-10-05 | `policy` (heurística mejorada), motor con los parches 0001–0012 | los 9 del pool | 60 | **0,07** | 30,8 puntos | 18 de 36 |
| 2026-10-05 | `search:sims=32` (modelo `mlp16-meta-v1`), motor 0001–0012 | ídem | 20 (680 de 720 partidas: cortada por el límite de 2,5 h; 34 enfrentamientos completos) | **−0,02** | 31,6 puntos | 15 de 34 |
| 2026-10-05 | `policy:tempo=0` (la misma `policy`), motor con los parches 0001–0013 | los 9 del pool | 60 | 0,09 | 29,2 puntos | 17 de 36 |
| 2026-10-05 | `policy` con las reglas de DON!! (`793d118`, E13), motor con los parches 0001–0013 | los 9 del pool | 60 | **0,19** | **20,4 puntos** | 18 de 36 |

**Calibración con las reglas de DON!! (E13)**, mismos 36 enfrentamientos y mismos datos reales: en
el mismo motor (0001–0013), el error medio baja de 29,2 a 20,4 puntos y la correlación sube de
0,09 a 0,19 (la fila de `policy:tempo=0` separa el efecto de las reglas del efecto del parche
0013, que apenas mueve el error). Residuo de cada mazo = media, en sus 8 enfrentamientos, de su % de
victorias simulado menos el real (entre paréntesis, el simulado medio; medias calculadas sobre los
porcentajes redondeados del informe):

| Mazo | Antes (0001–0012, semilla `cal2`) | `policy:tempo=0` (0001–0013) | Reglas de DON!! (0001–0013) | Real (media) |
|---|---|---|---|---|
| Kaido | −40,0 (3 %) | −40,6 (2 %) | **−22,5** (20 %) | 43 % |
| Enel | −32,5 (22 %) | −30,0 (25 %) | **+10,9** (66 %) | 55 % |
| Luffy OP17-079 | +26,5 (79 %) | +25,8 (78 %) | **+17,6** (70 %) | 52 % |
| Sabo | +15,5 (61 %) | +19,8 (66 %) | **+10,9** (57 %) | 46 % |
| Robin | +25,3 (67 %) | +12,6 (54 %) | +0,5 (42 %) | 42 % |
| Shanks | +11,0 (57 %) | +13,9 (60 %) | −0,6 (45 %) | 46 % |
| Pudding | +1,1 (51 %) | −8,6 (41 %) | −3,5 (46 %) | 50 % |
| Luffy & Ace | +8,8 (71 %) | +8,9 (71 %) | +4,0 (66 %) | 62 % |
| Rocks | −15,6 (39 %) | −1,6 (53 %) | −17,3 (38 %) | 55 % |

Kaido y Enel, los dos mazos de rampa de DON!!, eran los más lejos de la realidad y son los que más
se acercan; Luffy y Sabo, sobrestimados porque sus rivales de rampa no sabían jugar, bajan 8 y
9 puntos. Quedan desajustes grandes: Kaido sigue muy por debajo (3 % contra Luffy frente a 49 %
real, 8 % contra Enel frente a 53 %), Enel pasa a estar por encima en algunos cruces (88 % contra
Rocks frente a 43 %, 92 % contra Kaido frente a 47 %) y Rocks empeora sobre todo por dos cruces
(12 % contra Enel frente a 57 % real y 15 % contra Luffy & Ace frente a 62 %). Con 20 puntos de
error medio la matriz simulada aún no sirve para estudiar enfrentamientos concretos.

```bash
# Desde el worktree del commit 793d118; la caché de Limitless es la de la copia principal.
bun packages/opbot/src/cli.ts calibrate --decks decks/meta-op17-postban --agent policy --games 60 \
  --workers 2 --seed cal4 --cache /home/user/cold2sport/out/limitless-cache \
  --out out/calibrate-policy-tempo.jsonl
bun packages/opbot/src/cli.ts calibrate --decks decks/meta-op17-postban --agent "policy:tempo=0" \
  --games 60 --workers 2 --seed cal4 --cache /home/user/cold2sport/out/limitless-cache \
  --out out/calibrate-policy-tempo0.jsonl
```

**Calibración con el motor corregido (parches 0001–0012) y `policy`** (36 enfrentamientos con al
menos 5 partidas reales): la correlación sube de −0,23 a 0,07, pero la simulación sigue sin
parecerse a la realidad. Los dos casos más extremos son **Kaido** (0 % contra Luffy simulado, 49 %
real; pierde casi todo salvo contra Pudding y Enel) y **Enel** (3–10 % contra Shanks, Luffy y
Luffy & Ace, frente a 48–71 % reales). Con el bot de búsqueda la calibración **no mejora** (correlación −0,02): un
bot más fuerte no basta, hay sesgos sistemáticos. Diferencia media simulado − real por mazo (puntos;
enfrentamientos con al menos 5 partidas reales, búsqueda):

| Sabo | Luffy | Robin | Pudding | Rocks | Shanks | Kaido | Luffy & Ace | Enel |
|---|---|---|---|---|---|---|---|---|
| +32,8 | +29,5 | +16,8 | +14,2 | −1,5 | −2,6 | −22,1 | −24,1 | −45,4 |

Un diagnóstico de Kaido y Enel (partidas instrumentadas y comprobación de todas sus cartas contra el
texto oficial) encontró que **el motor no es la causa principal**: las cartas son correctas, salvo un
fallo de reglas de "[Once Per Turn]" que afectaba sobre todo a Rocks (corregido en el parche
`0013`). La causa principal es cómo juegan los bots con el DON!! como recurso: Kaido gasta en
efectos el DON!! que necesita para crecer, Enel da sus 4 DON!! a un personaje que no puede atacar y
juega sus eventos DON!! −X justo después de reponer el DON!!; la búsqueda hereda esos fallos porque
simula con la misma política. Con esas correcciones en memoria Enel pasaba del 24 % al 57–60 % y
Kaido del 3 % al 22 % (política contra política). En marcha: llevarlas a la política como reglas
generales y volver a calibrar.

```bash
bun packages/opbot/src/cli.ts calibrate --decks decks/meta-op17-postban --agent policy --games 60 \
  --workers 3 --seed cal2
```

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

## Enel (OP15-058) antes y después del parche `0007`

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

> **Nota de integración.** La corrección "elige el máximo" se midió dentro del agente `heuristic`. Al
> integrar la política mejorada (`policy`, E9 y E10 abajo) se ha movido allí: `heuristic` vuelve a ser
> el bot del motor **sin cambios**, que es la referencia del "bot que ya existe". Las filas "Solo el
> agente", "Motor + agente" y "Final" corresponden por tanto al comportamiento que ahora tiene
> `policy` en esas preguntas, no a `heuristic`.

## E13 y E14: el DON!! como recurso

Diagnóstico (5-oct): en la simulación Kaido OP17-058 y Enel OP15-058 perdían casi todo (en la
calibración con `policy`, Kaido ganaba de media el 3 % de sus enfrentamientos frente al 43 % real
y Enel el 22 % frente al 55 %) porque la política rápida, que juega `policy` y también todos los
rollouts de la búsqueda, gastaba el DON!! como si fuera gratis: Kaido pagaba el DON!! −1 de su
Líder en cada ataque (160 de 160 veces contra Sabo) y nunca llegaba a 9–10 DON!! para sus cartas
grandes; el Líder Enel daba sus 4 DON!! a una carta que no podía atacar (solo 53 de 173 veces a
una que sí), jugaba sus Eventos con DON!! −X después de su recarga quitándole los DON!! al
atacante, y todos los DON!! −X se pagaban con DON!! activos primero. Además la búsqueda decidía
"añade hasta 1 DON!!" por el ruido de los rollouts (elegía añadir 0).

Correcciones como reglas generales, no por mazo (`packages/opbot/src/agents/policy.ts`, sección
"DON!! as a resource"; resumen en `docs/NOTAS_MOTOR.md` §6): A) orden de devolución de DON!!,
B) a quién se dan los DON!!, C) un DON!! −X solo si no deja menos DON!! para el turno siguiente
(con excepciones de defensa, Vida y letal), D) eventos con DON!! −X después de atacar si le
quitarían los DON!! a un atacante, y antes de una recarga de DON!!; E) la búsqueda contesta las
cantidades "hasta N" que son una regla (añadir/dar/enderezar DON!!, añadir a la vida, robar) con
la respuesta de la política, sin rollouts. `policy:tempo=0` y `search:...,rollout=policy0` son
exactamente las versiones anteriores (comprobado: 0 diferencias en 14.192 decisiones de la
política en 60 partidas, sobre el estado real y sobre uno determinizado, y 0 en 754 decisiones de
la búsqueda).

**E13, por mazo**: % de victorias de cada bot con ese mazo, frente a los mismos rivales, asientos
y cartas (36 partidas por bot y mazo; ±16 puntos):

| Mazo | `policy` (reglas de DON!!) | `policy:tempo=0` | Diferencia |
|---|---|---|---|
| Enel | 80,6 % | 19,4 % | +61,1 |
| Pudding | 61,1 % | 25,0 % | +36,1 |
| Luffy & Ace | 66,7 % | 44,4 % | +22,2 |
| Kaido | 19,4 % | 5,6 % | +13,9 |
| Sabo | 72,2 % | 58,3 % | +13,9 |
| Luffy OP17-079 | 80,6 % | 69,4 % | +11,1 |
| Robin | 47,2 % | 38,9 % | +8,3 |
| Rocks | 50,0 % | 41,7 % | +8,3 |
| Shanks | 61,1 % | 58,3 % | +2,8 |

Ningún mazo empeora. Enel es el que más cambia (las reglas B y D son las de su Líder); Pudding y
Luffy & Ace también dan DON!! con efectos (Líder Pudding, OP12-015, ST21-014, Thousand Sunny) o
pagan DON!! −2 (Mamaragan, Conquest of the Sea). Kaido mejora pero sigue muy por debajo: le
ganan casi todos los mazos también con las reglas nuevas.

Con la misma política en los dos lados (calibración de arriba, 60 partidas por cruce), Kaido gana
de media el 20 % de sus 8 cruces y Enel el 66 %; el diagnóstico, con versiones experimentales y
en parte específicas de mazo de estas reglas, había medido 20–23 % y 57–60 % (320 partidas por
mazo). En una partida de Kaido contra Luffy OP17-079 trazada a mano, Kaido ya llega a 9–10 DON!! y
juega sus cartas de coste 9–10, pero pierde la carrera de vidas: en el turno rival no le quedan
DON!! activos para sus [Counter] de coste 2 y acumula 9–12 cartas en la mano. Eso ya no es del
DON!! −X; queda pendiente.

**E14, por mazo** (la búsqueda con las reglas nuevas en sus rollouts frente a la anterior; 36
partidas por bot y mazo, ±16 puntos):

| Mazo | `search` (reglas de DON!!) | `search:...,rollout=policy0` | Diferencia |
|---|---|---|---|
| Enel | 41,7 % | 11,1 % | +30,6 |
| Pudding | 72,2 % | 41,7 % | +30,6 |
| Luffy & Ace | 69,4 % | 38,9 % | +30,6 |
| Kaido | 52,8 % | 30,6 % | +22,2 |
| Robin | 55,6 % | 36,1 % | +19,4 |
| Sabo | 80,6 % | 66,7 % | +13,9 |
| Shanks | 41,7 % | 33,3 % | +8,3 |
| Rocks | 50,0 % | 41,7 % | +8,3 |
| Luffy OP17-079 | 69,4 % | 66,7 % | +2,8 |

Tampoco aquí empeora ningún mazo. E14 mide juntas las dos partes (reglas de DON!! en los rollouts
y en la jugada candidata, y cantidades "hasta N" por regla); no se han medido por separado. La
ganancia es casi la misma que en E13 (+65 frente a +70 Elo). Hipótesis, no medida: la búsqueda
elige la jugada raíz, pero sus rollouts juegan la política, y las cantidades "hasta N DON!!" las
decidía el ruido (el diagnóstico la vio añadir 0 DON!! con el Líder Enel). Con Enel la búsqueda
sigue ganando menos de la mitad de sus partidas.

Comandos (desde este worktree en el commit `793d118`; E13 y las calibraciones compartieron la
máquina con otra tarea larga, E14 en parte):

```bash
# E13
bun packages/opbot/src/cli.ts arena --candidate policy --baseline "policy:tempo=0" \
  --decks decks/meta-op17-postban --blocks 162 --workers 2 --sprt 0,35 --no-stop --engine fast \
  --seed tempo1 --out out/arena-tempo-policy.jsonl

# E14 (modelo por defecto, models/value.json = mlp16-meta-v1)
bun packages/opbot/src/cli.ts arena --candidate "search:sims=32,h=1,cands=12" \
  --baseline "search:sims=32,h=1,cands=12,rollout=policy0" --decks decks/meta-op17-postban \
  --blocks 162 --workers 2 --sprt 0,35 --no-stop --engine fast --seed tempo2 \
  --out out/arena-tempo-search.jsonl
```

## E12: modelo de valor entrenado con el meta

Datos: `pnpm opbot selfplay --decks decks/meta-op17-postban --games 6000 --agents
"policy:3,policy-honest:1,heuristic:1,aggressive:1" --seed meta1` (133.444 posiciones; motor con los
parches 0001–0007). Precisión sobre las partidas apartadas para prueba (26.788 posiciones; se
reproduce con `bun packages/opbot/scripts/eval-models.ts <modelos>`):

| Modelo | Log-loss | Acierto |
|---|---|---|
| Hecho a mano | 0,581 | 67,7 % |
| `logreg-test-v1` (mazos sintéticos; era el modelo por defecto) | 0,571 | 68,2 % |
| `mlp16-test-v1` (mazos sintéticos) | 0,504 | 72,1 % |
| `logreg-meta-v1` | 0,467 | 75,3 % |
| **`mlp16-meta-v1`** (ahora `models/value.json`) | **0,432** | **77,6 %** |
| `mlp32-meta-v1` | 0,433 | 77,7 % |

En la arena, % de victorias con cada mazo, con un modelo y con el otro en las mismas partidas
(mismas semillas y rivales; 36 partidas por mazo y modelo):

| Mazo | `mlp16-meta-v1` | `logreg-test-v1` | Diferencia |
|---|---|---|---|
| Kaido | 61,1 % | 5,6 % | +55,6 |
| Luffy & Ace | 77,8 % | 27,8 % | +50,0 |
| Luffy OP17-079 | 88,9 % | 38,9 % | +50,0 |
| Rocks | 72,2 % | 27,8 % | +44,4 |
| Pudding | 63,9 % | 22,2 % | +41,7 |
| Shanks | 77,8 % | 38,9 % | +38,9 |
| Sabo | 94,4 % | 55,6 % | +38,9 |
| Robin | 69,4 % | 38,9 % | +30,6 |
| Enel | 19,4 % | 19,4 % | 0,0 |

Con Enel los dos modelos ganan lo mismo y muy poco: no es un fallo del modelo nuevo, sino que
Enel sale débil en la simulación (en torneos reales gana el 48 %). Pendiente de revisar en la
calibración: puede ser alguna carta aún mal implementada (la segunda ronda corrige el "si tu Líder
es [Enel]" de Varie, El Thor y Kiten) o que el bot no sepa jugar sus costes DON!! −X.

```bash
bun packages/opbot/src/cli.ts arena \
  --candidate "search:sims=32,h=1,cands=12,model=packages/opbot/models/value-mlp16-meta-v1.json" \
  --baseline "search:sims=32,h=1,cands=12" --decks decks/meta-op17-postban --blocks 162 \
  --workers 2 --batch 6 --sprt 0,35 --no-stop --engine fast --seed e12 \
  --out out/e12-mlp16meta-vs-default.jsonl
```

Desde este cambio `models/value.json` es `mlp16-meta-v1`; el modelo anterior se conserva como
`models/value-logreg-test-v1.json` (E1–E11 se midieron con él). `train-value` escribe por defecto en
`out/value.json`, para no sustituir el modelo por defecto sin querer.

## E11: búsqueda contra el bot del motor en el meta (motor corregido)

% de victorias del candidato (búsqueda) con cada mazo, contra todos los mazos del pool manejados
por la heurística del motor, 36 partidas por mazo:

| Mazo | Victorias |
|---|---|
| Sabo OP13-004 | 88,9 % |
| Luffy OP17-079 | 80,6 % |
| Rocks OP17-039 | 77,8 % |
| Robin OP09-062 | 75,0 % |
| Luffy & Ace ST30-001 | 75,0 % |
| Shanks OP17-020 | 72,2 % |
| Pudding OP08-058 | 61,1 % |
| Enel OP15-058 | 58,3 % |
| Kaido OP17-058 | 52,8 % |

Comparado con E8 (mismo tipo de prueba, motor sin corregir): allí la búsqueda sacaba 57 % y con
Rocks perdía casi siempre (0 % contra Luffy y Shanks); ahora gana con Rocks el 78 %. Kaido, Pudding
y Enel son los más bajos: Kaido y los dos mazos de Big Mom aún tienen cartas por corregir (segunda
ronda), y la heurística rival se beneficia igual que nosotros de las mismas cartas.

```bash
bun packages/opbot/src/cli.ts arena --candidate "search:sims=32,h=1,cands=12" --baseline heuristic \
  --decks decks/meta-op17-postban --blocks 162 --workers 3 --batch 6 --sprt 0,35 --no-stop \
  --engine fast --seed e11 --out out/e11-meta9-search32-vs-heuristic.jsonl
```

## E9 y E10: política rápida mejorada (`policy`)

`policy` (`packages/opbot/src/agents/policy.ts`) es la heurística del motor con correcciones
puntuales donde desperdicia cartas; `heuristic` sigue siendo el bot del motor sin tocar. Ver la
lista de correcciones en `docs/NOTAS_MOTOR.md` (§6).

**E9, por mazo**: % de victorias de cada bot con ese mazo, frente a los mismos rivales, asientos y
cartas (32 partidas por bot y mazo; muestras pequeñas, ±17 puntos):

| Mazo | `policy` | `heuristic` |
|---|---|---|
| Luffy (OP17-079) | 90,6 % | 81,3 % |
| Sabo | 71,9 % | 71,9 % |
| Shanks | 71,9 % | 62,5 % |
| Enel | 65,6 % | 9,4 % |
| Pudding | 62,5 % | 21,9 % |
| Robin | 62,5 % | 18,8 % |
| Rocks | 62,5 % | 28,1 % |
| Kaido | 15,6 % | 3,1 % |

Las mayores diferencias son las esperadas: con la heurística el Líder Enel añade y da 0 DON!!,
Divine Departure y los eventos de Rocks se juegan sin efecto, Big Mom no juega sus [Trigger]
"Juega esta carta" de coste 5–7 y Kaido paga DON!! −1 para no elegir objetivo. Por emparejamiento
(los dos asientos), `policy` no queda por debajo del 50 % en ninguno salvo el espejo de Sabo
(25 %, 4 partidas).

Dónde decide distinto (64 partidas `policy` contra `policy` con los 8 mazos, 7.242 decisiones;
en cada una se pregunta también a la heurística): 16 % de las decisiones. Objetivos de efectos 307
de 709 (sobre todo −X de poder de Kaido OP17-058, Shiki OP17-048 y Kiten OP15-076, y Gerd
OP17-081 recuperando del cementerio); "añade hasta N DON!!" 252 de 252 (Líderes Enel, Robin y
Pudding); Eventos que la heurística jugaría sin efecto 364 de 3.185 decisiones de fase main
(Divine Departure 170, OP17-055/056 de Rocks 115) y [Activate: Main] sin efecto 20 (Líder
Shanks sin Personajes rivales girados, King y Queen con el mazo de DON!! vacío); "da hasta N
DON!!" 85 de 85; "añade hasta 1 a la vida" 49 de 49; [Trigger] 32 de 99 (Sweet 3 Generals,
Smoothie, Katakuri y eventos cuyo DON!! ya no existe); costes opcionales rechazados por no hacer
nada 32 de 559; "elige una" 4 de 26.

**E10, por mazo** (búsqueda con rollouts `policy` frente a la misma búsqueda con los rollouts
anteriores; 19–27 partidas por bot y mazo, solo orientativo):

| Mazo | rollouts `policy` | rollouts anteriores |
|---|---|---|
| Shanks | 89,5 % | 47,4 % |
| Luffy (OP17-079) | 78,9 % | 68,4 % |
| Sabo | 74,1 % | 74,1 % |
| Pudding | 59,3 % | 51,9 % |
| Robin | 51,9 % | 40,7 % |
| Enel | 42,1 % | 36,8 % |
| Kaido | 31,6 % | 15,8 % |
| Rocks | 15,8 % | 0,0 % |

Ningún mazo empeora. Por emparejamiento (los dos asientos), solo Robin–Enel (33 %, 6 partidas) y
Pudding–Sabo (38 %, 8) quedan por debajo del 50 %. Que la ganancia sea menor que en E9 es lo
esperable (hipótesis, no medida): la búsqueda ya evita parte de los errores de su política al
elegir la jugada raíz; los rollouts mejores se notan en la evaluación de las jugadas.

Comandos (desde el worktree del commit `3c13662`, máquina compartida con otras tareas):

```bash
# E9 (128 bloques = un ciclo completo; el SPRT decide H1 a los 32)
bun packages/opbot/src/cli.ts arena --candidate policy --baseline heuristic \
  --decks decks/meta-op17-postban --blocks 128 --workers 2 --sprt 0,35 --no-stop --engine fast \
  --seed pol1 --out out/arena-policy-vs-heuristic.jsonl

# E10 (lanzado con --blocks 256 y detenido a mano tras el lote de 88 bloques, ~95 min;
# el resumen se regenera con --resume --blocks 88)
bun packages/opbot/src/cli.ts arena --candidate "search:sims=32,h=1,cands=12" \
  --baseline "search:sims=32,h=1,cands=12,rollout=engine" --decks decks/meta-op17-postban \
  --blocks 256 --workers 2 --sprt 0,35 --no-stop --engine fast --seed srch1 \
  --out out/arena-search-rollout-policy-vs-engine.jsonl
```

## Pendientes / en curso

- Corrección de cartas del meta en el motor (parches `0003` y siguientes; ver `vendor/tcg-engines/UPSTREAM.md`).
  Tras ella: repetir E8 y E6 con el motor corregido y recalibrar con el bot de búsqueda.
- Repetir E9 y E10 con el motor corregido (cartas del meta) y con tamaño fijo más grande.
- E5 y E2 con tamaño fijo (la parada temprana del SPRT y el corte manual dejan intervalos anchos).
- Calibración con las reglas de DON!!: Kaido sigue 22 puntos por debajo (defensa en el turno
  rival: DON!! activos para sus [Counter] y uso de la mano) y Enel pasa a estar sobrestimado contra
  Rocks y Kaido. Repetir la calibración con el bot de búsqueda.

## Cómo leer estos números

- Son resultados **contra bots**, no contra humanos. Que el bot gane al 91 % a la heurística del
  motor dice que la búsqueda funciona, no que juegue como un campeón regional.
- Los mazos de prueba son sintéticos (cartas de OP-01 a OP-04, no legales en Standard). Las cifras
  que importan para estudiar el meta son las de `decks/meta-*`.
- Desde el commit `3254f3d` los experimentos se ejecutan desde un worktree congelado
  (`out/wt`), para que ningún cambio de código se cuele a mitad de una medición.
