# Proyecto: bot de análisis para One Piece Card Game

> Objetivo: un "Stockfish de One Piece" para **entrenar y analizar en casa**: recomendar jugadas en
> una posición, simular enfrentamientos entre mazos y ajustar listas con datos.
> **No se usa nunca durante partidas de torneo** (sería trampa y motivo de sanción de Bandai).

Plan original: 5 de octubre de 2026. Revisado el 4 de octubre de 2026 tras ejecutar las fases 0 a 3
y una investigación del estado del arte con verificación de fuentes (`docs/INVESTIGACION.md`). Este
documento sustituye al plan original; la sección 8 lista qué estaba mal en él y por qué se ha cambiado.

---

## 1. Estado actual (resumen)

| Fase | Estado | Resultado |
|---|---|---|
| 0. Puesta en marcha | ✅ | Node 24, pnpm 10.33, Bun. CI de One Piece en verde, `play-cli` y `bot-lab doctor` OK |
| 1. Entender el motor | ✅ | `docs/NOTAS_MOTOR.md`. Motor 9–13× más rápido para simulación (parche + simulador propio verificado con 300 partidas) |
| 2. Banco de pruebas | 🟡 | Arena emparejada con SPRT lista. Pool de mazos del meta post-ban en construcción (`decks/`) |
| 3. Bot de búsqueda | 🟡 | Bot de búsqueda honesto: **91 % [86,5–95,4 %] contra la heurística del motor** (144 pares en curso). ISMCTS con árbol sobre el turno, implementado y en evaluación |
| 4. Herramientas | 🟡 | Analizador de posiciones (JSON o partida) y simulador de enfrentamientos, primera versión |
| 5. Aprendizaje | 🟡 | Ya hay un modelo de valor aprendido (regresión logística sobre 416.000 posiciones). Falta la versión con cartas y la autoplay con búsqueda |

---

## 2. Qué existe ya y qué significa "ser mejor"

La investigación (octubre 2026) encontró que **sí existen IAs fuertes de One Piece**:

| Herramienta | Qué es | Lo que no hace |
|---|---|---|
| **OPTCG AI** (optcgai.com) | Rival que, según su web, combina PPO + MCTS con información oculta; modelos nuevos cada pocas semanas (datos no verificables: la web bloquea accesos automáticos) | No analiza posiciones que tú introduces; no simula enfrentamientos; código cerrado; sin fuerza publicada salvo "75 % contra su versión anterior" |
| **SeaKing** (seaking.gg) | Rival con búsqueda e información justa, botón de pista y revisión post-partida (letales perdidos y nota de decisiones) | La revisión ve las dos manos (a toro pasado) y solo lee partidas contra su bot; no importa partidas reales ni da % calibrados |
| **OPlayTCG** | Modo "Solo vs AI" desde agosto de 2026 y estadísticas del meta (1º/2º) | Algoritmo no publicado; árbol de jugadas manual |
| Bots de `tcg-engines` | Heurística sin búsqueda que ve la información oculta | — |
| HeitorWestphal/optcg-ai | Sobre el mismo motor; sus intentos con MCTS y red neuronal no lograron batir a una heurística ajustada (evidencia débil: motor con errores y solo 40 simulaciones) | — |
| SimOP | MCTS, determinización, evaluación aprendida y analizador (sep 2026) | Solo OP-01 a OP-03 (bloque 1, fuera de Standard); sin licencia |

Ser "mejor que lo que existe" se concreta en tres listones medibles:

1. **Fuerza de juego, con información justa** (sin ver la mano rival, las vidas ni el orden del
   mazo), medida con nuestra arena (pares con las mismas cartas, SPRT):
   - batir a `heuristic` y a `aggressive` del motor (este último le gana ~61 % al primero) con mazos
     del meta, por encima del 65 % y sin ningún enfrentamiento por debajo del 50 %;
   - publicar una escalera de versiones con Elo e intervalos (nadie publica nada parecido).
   - Más adelante, una serie manual registrada contra OPTCG AI (nivel alto) y SeaKing (Hard). Ojo:
     100 partidas dan un intervalo de ±10 puntos, solo detecta ventajas grandes.
2. **Análisis que nadie ofrece**: evaluar una posición que introduces tú, con la información que tú
   tenías en ese momento; probabilidad de letal; % de victoria por jugada con intervalo; matriz de
   enfrentamientos simulada con 1º/2º; prueba de cambios de cartas. Todo local y de código abierto.
3. **Fiabilidad**: cada mazo usado debe estar soportado por el motor (cartas presentes y efectos que
   se ejecutan), y los porcentajes deben estar calibrados (Brier).

---

## 3. Arquitectura (tal como está construida)

```
vendor/tcg-engines/        motor upstream (MIT), subconjunto fijado por commit + parches propios
  UPSTREAM.md              commit, qué se vendoriza, parches y cómo actualizar
vendor/patches/            cambios locales al motor (hoy: 0001, rendimiento)
packages/opbot/            nuestro código (TypeScript, Bun)
  src/engine/              simulación rápida, acciones, determinización
  src/eval/                rasgos de posición, modelo de valor, entrenamiento, autojuego
  src/search/              rollouts, ISMCTS
  src/agents/              agentes: búsqueda, ISMCTS, heurísticas, aleatorio
  src/arena/               partida, arena emparejada, estadística (SPRT pentanomial)
  src/analysis/            analizador de posiciones, simulador de enfrentamientos
  src/decks/               listas, legalidad Standard, pool del meta (API de Limitless)
  models/value.json        modelo de valor entrenado
decks/                     listas de mazos en texto (formato OPTCGSim: 4xOP01-016)
examples/positions/        posiciones de ejemplo para el analizador
docs/NOTAS_MOTOR.md        cómo funciona el motor y qué hemos cambiado
```

Decisiones clave:

1. **Motor vendorizado, no fork ni submódulo.** `cold2sport` no puede ser un fork, y el upstream es
   una exportación periódica de un repo privado (el historial puede cambiar). Se copia un subconjunto
   fijado por commit con `scripts/sync-engine.sh`, y los cambios propios viven como parches
   reaplicables.
2. **TypeScript en el mismo proceso que el motor**, ejecutado con Bun.
3. **Simulación rápida propia** (`sim.ts`): el mismo código de reglas sin immer, verificado contra
   el motor oficial comando a comando.
4. **Determinización honesta**: el bot solo ve lo que vería un jugador; lo oculto se re-reparte en
   cada simulación y se cambia la semilla (que, si no, revelaría los barajados futuros).
5. **Búsqueda**: v1 Monte Carlo sobre la decisión actual con *sequential halving* y mundos comunes;
   v2 ISMCTS (un árbol por conjunto de información) sobre el resto del turno. Rollouts con la
   heurística del motor hasta un horizonte y modelo de valor aprendido al final.
6. **Evaluación**: pares con la misma semilla y mazos fijos por asiento, bots intercambiados, primer
   jugador controlado (el piedra-papel-tijera se guioniza), SPRT pentanomial como en fishtest.

---

## 4. Fases revisadas

### Fase 2. Banco de pruebas (en curso)
- [x] Arena emparejada en paralelo con SPRT, resumen por enfrentamiento y por 1º/2º.
- [ ] Pool del meta **post-ban** (Mihawk OP14-020 prohibido desde el 12-oct-2026) desde la API
      pública de Limitless (la vía documentada; 50 peticiones cada 5 min).
- [ ] Legalidad Standard (bloques 2–5 + listas de excepciones + ban list y parejas prohibidas).
- [ ] Informe de soporte del motor por mazo (cartas que faltan, efectos que no se ejecutan).
- [ ] Matriz de enfrentamientos del meta según el bot.

### Fase 3. Bot de búsqueda (en curso)
- [x] v1: 91 % contra `heuristic` con mazos de prueba.
- [ ] Medir contra `aggressive`, `heuristic-honest` y con mazos del meta.
- [ ] ISMCTS (v2) contra v1; curva fuerza/tiempo (¿más simulaciones = más fuerza?).
- [ ] Mejorar la política de rollout (la heurística resuelve mal los "hasta N").
- [ ] Registro de conocimiento: recordar cartas reveladas (el motor las olvida).

### Fase 4. Herramientas para entrenar
- [x] Analizador de posiciones desde un JSON (`examples/positions/`), con % por jugada, intervalos,
      diferencia con la mejor y probabilidad de ganar este turno.
- [x] Simulador de enfrentamientos (mazo A contra B con IC y 1º/2º).
- [ ] Modo partida en terminal contra el bot con pista y **revisión post-partida** (marcar las
      decisiones que perdieron más % de victoria, como la "precisión" del ajedrez).
- [ ] Ajuste de mazo: cambiar X cartas y medir el efecto contra el meta.
- [ ] Importar partidas de OPTCGSim / OPBounty (formato de log por investigar).

### Fase 5. Aprendizaje (adelantada en parte)
- [x] Modelo de valor logístico entrenado por autojuego.
- [ ] Rasgos por carta (DeepSets o similar) y entrenamiento con partidas de la propia búsqueda.
- [ ] Modelo de oponente: listas por Líder y actualización bayesiana con lo que se ve.

### Mantenimiento
- EB-05 sale el 30-oct-2026 y OP-18 el 20-nov-2026: el motor aún no los tiene. Sincronizar el motor
  (`scripts/sync-engine.sh`) cuando upstream los añada y rehacer el pool del meta.
- Reglas: el motor sigue las Comprehensive Rules 1.2.0; la vigente es la 1.2.1 (28-ago-2026).
  Revisar las diferencias.

---

## 5. Cómo trabajar con Claude Code

- Una sesión por bloque de trabajo, sobre este repo. Las sesiones en la nube instalan todo solas
  (`.claude/hooks/session-start.sh` → `scripts/setup.sh`).
- `CLAUDE.md` (raíz) define cómo validar cambios. El motor vendorizado tiene sus propios
  `AGENTS.md`/`CLAUDE.md` y su skill de reglas en
  `vendor/tcg-engines/submodules/one-piece/.agents/skills/op-rules/`.
- Comandos: ver `README.md`.

---

## 6. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Errores de reglas o efectos no implementados en el motor | Informe de soporte por mazo; `capabilityHistory` en cada partida; contrastar con FAQ oficiales; reportar upstream (el issue #223 indica que hay tests de cartas que no pueden fallar) |
| Motor lento para búsqueda | Resuelto en la Fase 1 (parche + simulación rápida, con prueba diferencial) |
| Sobreajuste a la heurística (nuestro bot aprende a explotar sus fallos) | Evaluar también contra `aggressive`, contra versiones propias y, de forma manual, contra otras IAs; el rival en el árbol ISMCTS elige entre varias respuestas, no solo la de la heurística |
| Información oculta (*strategy fusion*) | ISMCTS; registro de conocimiento; modelo de oponente |
| Meta cambiante | Pool del meta regenerable con un comando; separar datos antes/después de cada ban |
| **Derechos de Bandai** | Hay informes (no verificados en fuente oficial) de simuladores online retirados a petición de Bandai. Uso personal y local; **este repo es público hoy: recomendable hacerlo privado** (y desactivar GitHub Pages, que venía de la web anterior). No publicar imágenes de cartas |
| Juego limpio | El bot se usa **solo** para estudiar, nunca durante un torneo |

---

## 7. En paralelo: plan como jugador

1. **Esta semana:** tutorial de [OPlayTCG](https://oplaytcg.com/en) y 10–20 partidas casuales.
2. **Elegir mazo** con tu amigo: uno del que te pueda prestar cartas y que esté en el meta
   post-ban. Ojo: **desde el 12 de octubre Mihawk (OP14-020) está prohibido**, y el Standard de esta
   temporada solo admite cartas de bloque 2 a 5 (OP-01 a OP-04 rotaron en abril de 2026, salvo
   excepciones).
3. **Torneos semanales en tienda** (app Bandai TCG+; el Store Tournament Vol. 4 va del 1-oct al
   31-dic).
4. **Registro de partidas:** apunta las decisiones dudosas; se pueden escribir como posiciones JSON
   para el analizador.
5. **Regionales.** Fechas confirmadas en la web oficial: Porto 7–8 nov, **Burdeos 14–15 nov**,
   Bristol 21–22 nov, **Elche/Elx (Alicante) 28–29 nov**, Múnich 5–6 dic, **Utrecht 5–6 dic**
   (Beatrix Theater; hubo otro en Utrecht en septiembre) y **Rungis 12–13 dic**. Elche es el más
   cercano si vives en España. Porto, Burdeos y Bristol se juegan con OP-17 + EB-05 y Mihawk ya
   prohibido; Elche, Múnich, Utrecht y Rungis incluyen además OP-18 (legal en eventos grandes 7 días
   después de su salida, el 27 de noviembre). Las Finales EU de la temporada 2 son en
   Londres del 16 al 17 de enero de 2027.

---

## 8. Fallos del plan original y cómo se han corregido

| # | En el plan original | Problema | Corrección |
|---|---|---|---|
| 1 | "Fork de tcg-engines" en un repo nuevo | Un repo existente no puede ser un fork; además el upstream es una exportación periódica y necesitamos parchearlo | Vendorizado fijado por commit, script de sincronización y parches reaplicables (`vendor/tcg-engines/UPSTREAM.md`) |
| 2 | Objetivo implícito: "no existe nada así" | Ya existen OPTCG AI (PPO+MCTS), SeaKing y la IA de OPlayTCG | Listones de "mejor" concretos y medibles (sección 2); el hueco real es el análisis |
| 3 | Criterio de éxito: ganar a la heurística en `bot-lab` con 200 bloques | En `bot-lab` los "pares" usan semillas distintas, el piedra-papel-tijera fijo impide alternar quién empieza, no hay corrección por mirar varias veces, y la heurística no es el bot más fuerte (`aggressive` le gana 61 %) | Arena propia con pares reales y SPRT; batir a `heuristic` y `aggressive`, con mazos del meta |
| 4 | "Importar 3–5 mazos del meta desde Limitless" | Los mazos de prueba del motor son sintéticos y usan cartas de bloque 1 (no legales en Standard); Limitless aún no tiene resultados de la temporada 2; Mihawk queda prohibido el 12-oct | Pool post-ban desde la API documentada de Limitless (play.limitlesstcg.com), con legalidad Standard y comprobación de soporte del motor |
| 5 | Cobertura "OP-01 a OP-17 completos" como suficiente | No hay rotación ni ban list en el motor; faltan EB-05 y OP-18 (oct/nov 2026) y algunos ST recientes (p. ej. el Líder ST30-001) | Módulo de legalidad propio; sincronizar el motor cuando upstream los añada |
| 6 | Medir rendimiento como simple trámite | El motor tal cual daba ~1 partida/s: búsqueda inviable | Parche de rendimiento + simulación rápida verificada (≈19 partidas/s por núcleo) |
| 7 | Determinizar "con la vista proyectada" | La semilla del estado revela los barajados futuros; los prompts resueltos guardan la mano rival; el motor olvida las revelaciones | Determinización que re-reparte lo oculto, cambia la semilla y descarta prompts resueltos; registro de conocimiento pendiente |
| 8 | Comparar contra la heurística sin más | Los bots del motor reciben el estado completo (son "oráculo") | Nuestro bot es honesto y aun así gana; añadido `heuristic-honest` para medir la ventaja del oráculo |
| 9 | Analizador: "introduces una situación" | Introducir un estado completo a mano es inviable | Formato JSON de posición (lo desconocido se rellena con la lista del mazo y se re-reparte) y modo partida/revisión |
| 10 | Rollouts completos con la heurística | Partidas de ~90 decisiones: demasiado caro por jugada | Rollouts cortos hasta un horizonte de turno + modelo de valor aprendido |
| 11 | Estadísticas de OPlayTCG como fuente | Su robots.txt bloquea a crawlers de IA y no tiene API | Solo consulta manual; gumgum.gg prohíbe el scraping en sus términos |
| 12 | Regionales "Burdeos, Utrecht y Rungis" | Correctas, pero había más opciones y una más cercana | Fechas verificadas y añadidas Elche (Alicante), Porto, Bristol y Múnich |
| 13 | Riesgo legal "uso personal" | El repo es público | Recomendación: repo privado |
| 14 | "No hace falta programar reglas ni efectos de cartas" | Falso para el meta actual: faltan cartas (ST34-002/003/004, Líder ST30-001), los costes de las cartas OP15-074 a 078 (paquete de Enel) no están implementados y OP17-119 Loki ofrece objetivos que luego rechaza. Afecta a ~25 % del meta post-ban | Validación de restricciones ocultas en nuestro código; cartas y costes nuevos como parches del motor con tests (`vendor/patches/0002-*`, en curso) |
| 15 | La API de OPTCG llega hasta OP-15 | Desfasado: ya cubre hasta OP-17 (le falta ST-29) y es el origen de errores de signo en el motor | Solo para precios; datos de cartas, de la web oficial |
| 16 | SimOP "solo OP-01, sin licencia" | Cubre OP-01 a OP-03 y ya tiene MCTS y analizador; sigue sin licencia | Referencia conceptual, sin copiar código |
