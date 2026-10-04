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

Comando E1:

```bash
pnpm opbot arena --candidate "search:sims=64,h=1,cands=12" --baseline heuristic \
  --decks test --blocks 144 --workers 4 --batch 6 --sprt 0,35 --no-stop --engine fast \
  --seed a2 --out out/arena-search64-vs-heuristic-144.jsonl
```

## Pendientes / en curso

- E2: búsqueda contra `aggressive` (el bot del motor que gana ~61 % a `heuristic`).
- E3: ISMCTS (árbol sobre el turno) contra la búsqueda plana.
- E4: `heuristic-honest` contra `heuristic` (cuánto vale el acceso oráculo).
- E5: 256 contra 64 simulaciones (¿escala con el cálculo?).
- Todo lo anterior con mazos del meta post-ban.

## Cómo leer estos números

- Son resultados **contra bots**, no contra humanos. Que el bot gane al 91 % a la heurística del
  motor dice que la búsqueda funciona, no que juegue como un campeón regional.
- Los mazos de prueba son sintéticos (cartas de OP-01 a OP-04, no legales en Standard). Las cifras
  que importan para estudiar el meta son las de `decks/meta-*`.
- Desde el commit `3254f3d` los experimentos se ejecutan desde un worktree congelado
  (`out/wt`), para que ningún cambio de código se cuele a mitad de una medición.
