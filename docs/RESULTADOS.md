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

## Calibración de enfrentamientos frente a resultados reales

`pnpm opbot calibrate`: simula cada par de mazos del pool con el mismo bot en los dos lados y lo
compara con los resultados reales entre esos Líderes en los torneos de Limitless (caché local).

| Fecha | Bot | Mazos | Partidas simuladas por par | Correlación con la realidad | Error medio | Mismo favorito |
|---|---|---|---|---|---|---|
| 2026-10-05 | `heuristic` | Rocks, Luffy (OP17-079), Sabo, Shanks | 60 | **−0,24** | 37 puntos | 2 de 5 |

Ejemplos: Rocks contra Shanks sale 2 % simulado frente a 75 % real (8 partidas); Rocks contra Sabo,
18 % frente a 71 % (34). La heurística del motor juega muy mal algunos mazos (por ejemplo, con
Rocks usa el efecto de Linlin para darse +1000 a sí misma cuando el ataque va al Líder), así que
**una simulación con bots flojos no sirve para estudiar enfrentamientos**. Muestra real aún pequeña
(3 torneos post-ban); se está ampliando.

Comando E1:

```bash
pnpm opbot arena --candidate "search:sims=64,h=1,cands=12" --baseline heuristic \
  --decks test --blocks 144 --workers 4 --batch 6 --sprt 0,35 --no-stop --engine fast \
  --seed a2 --out out/arena-search64-vs-heuristic-144.jsonl
```

## Pendientes / en curso

- E5: 256 contra 64 simulaciones (¿escala con el cálculo?). En curso.
- E2 con tamaño fijo (la parada temprana del SPRT deja un intervalo ancho).
- Todo lo anterior con mazos del meta post-ban, cuando el motor soporte las cartas que faltan.

## Cómo leer estos números

- Son resultados **contra bots**, no contra humanos. Que el bot gane al 91 % a la heurística del
  motor dice que la búsqueda funciona, no que juegue como un campeón regional.
- Los mazos de prueba son sintéticos (cartas de OP-01 a OP-04, no legales en Standard). Las cifras
  que importan para estudiar el meta son las de `decks/meta-*`.
- Desde el commit `3254f3d` los experimentos se ejecutan desde un worktree congelado
  (`out/wt`), para que ningún cambio de código se cuele a mitad de una medición.
