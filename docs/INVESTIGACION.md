# Bot de análisis para One Piece Card Game ("Stockfish de OPTCG"): informe consolidado a 4 de octubre de 2026

**Cómo leer las marcas de verificación.** Cada afirmación importante lleva una marca:

| Marca | Significado |
|---|---|
| **[V]** | El verificador la confirmó en la fuente primaria o en el código clonado. |
| **[P]** | Parcialmente cierta. Lo esencial se confirmó, pero el verificador corrigió o añadió matices (se indican). |
| **[NV]** | No verificable en la fuente primaria (solo fragmentos de buscador, página bloqueada, etc.). No debe tratarse como un hecho. |
| **[R]** | Refutada por el verificador. Solo aparece para corregirla. |
| **[SC]** | Sin contrastar. La aporta un investigador con su fuente, pero el verificador no la revisó. |
| **[F]** | Comprobada o calculada durante esta fusión. |

**Rutas locales de referencia:**
- Motor vendorizado: `/home/user/cold2sport/vendor/tcg-engines/submodules/one-piece/packages`
- Clon completo del repositorio original, en el commit `53a79413c` del 1 oct 2026: `(scratch de la sesión)/tcg-engines`
- PDF de las CR 1.2.1: `(scratch de la sesión)/up_check/cr20260828.pdf`

---

## Resumen ejecutivo

1. **Ya existen IA de OPTCG más fuertes que cualquier cosa del ecosistema TheCardGoat.**
   - OPTCG AI (optcgai.com) dice combinar PPO y MCTS adaptado a información oculta, y publica versiones nuevas cada pocas semanas [NV].
   - SeaKing (seaking.gg) tiene un rival basado en búsqueda que solo usa información pública. Su "Game Review" busca letales perdidos y califica las decisiones [V].
   - OPlayTCG ofrece "Solo vs AI" desde el 12 ago 2026 [V].
   - Por tanto, es falso que superar al bot `heuristic` de tcg-engines bastaría para ser lo mejor que existe [R].
2. **Nadie publica una fuerza absoluta**: ni Elo, ni resultados contra humanos, ni partidas entre bots. La única cifra disponible es el "~75% contra la versión anterior" de OPTCG AI [NV].
3. **El hueco que podemos ocupar es el análisis.** Ninguna herramienta encontrada reúne todo esto a la vez:
   - analizar posiciones importadas usando solo la información que el jugador tenía;
   - dar probabilidades de victoria calibradas y con intervalos de confianza;
   - un laboratorio de emparejamientos simulados, con IC y separando quién empieza;
   - fuerza publicada y reproducible;
   - código abierto que se ejecuta en local.

   Como rival de juego, superar a OPTCG AI exigiría un esfuerzo serio de aprendizaje por refuerzo más búsqueda.
4. **Pila algorítmica recomendada** (sección 2), en orden:
   1. Ruta rápida del motor para búsqueda.
   2. Determinizador con creencias sacadas de listas de torneo.
   3. Abstracción de acciones (counters, DON!!, ataques).
   4. Bot v1: PIMC por turno con beam search.
   5. Bot v2: SO-ISMCTS con PUCT y progressive widening.
   6. Evaluación heurística afinada, sustituida después por una red de valor sobre conjuntos de cartas.
5. **Evaluación** (sección 3): semillas duplicadas y SPRT con α=β=0,05.
   - Distinguir un 55% de un 50% cuesta 783 partidas con n fijo, o unas 527 de media con SPRT [V].
   - Distinguir +20 Elo cuesta unas 1.574 de media con SPRT [V].
   - "200 bloques emparejados" (400 partidas) solo detecta efectos de unos +49 Elo (57%) [F].
6. **Datos** (sección 4):
   - Listas y emparejamientos: la API de Limitless, que no pide clave y admite unas 50 peticiones cada 5 minutos [V].
   - Datos de cartas: Bandai (oficial) o punk-records (JSON semanal) [V].
   - OPlayTCG solo a mano: su robots.txt bloquea a ClaudeBot [V].
7. **Formato** (sección 5):
   - OP-17 es la última colección en inglés (28 ago 2026). EB-05 sale el 30 oct y OP-18 el 20 nov [V].
   - El formato Standard (abr 2026 – mar 2027) admite los bloques 2 a 5, más unas listas oficiales de excepción [V].
   - OP14-020 Mihawk queda prohibido desde el 12 oct 2026 [V].
   - Regionales confirmados: Burdeos (14–15 nov), Elx/Alicante (28–29 nov), Utrecht (5–6 dic) y Rungis, que la web llama "Paris" (12–13 dic) [V].
8. **Motor tcg-engines** (sección 6):
   - Es una buena base, pero se mantiene a ratos: el mantenedor prioriza Grand Archive y Flesh and Blood [V].
   - El historial se reescribió [V] y no se publica en npm [V].
   - Implementa las reglas CR 1.2.0, mientras que la vigente es la 1.2.1 [V].
   - No valida la legalidad de los mazos (bloques ni prohibidas) [V] y arrastra errores de datos de optcgapi [V].
   - Recomendación: vendorizar una instantánea más una cola de parches, fijada por SHA del commit y por hash del árbol.
9. **El plan original tiene supuestos falsos o desfasados** (sección 7):
   - optcgapi ya cubre hasta OP-17 [F].
   - SimOP cubre OP01–OP03 y ya incluye MCTS y un analizador [V].
   - Limitless todavía no tiene resultados de los torneos grandes de la temporada 2 [V].

---

## 1. Bots y herramientas que ya existen para One Piece TCG

### 1.1 Tabla comparativa (IA de juego y análisis)

| Nombre | Algoritmo | Cobertura | ¿Análisis? / ¿Simulación de emparejamientos? | Licencia | Fuerza conocida | Verif. |
|---|---|---|---|---|---|---|
| **OPTCG AI** ([optcgai.com/en](https://optcgai.com/en/), [optcgai.com/it/human](https://optcgai.com/it/human), [x.com/optcgai](https://x.com/optcgai)) | "Combines reinforcement learning (PPO) and Monte Carlo Tree Search (MCTS), adapted to handle the game's hidden information". No usa LLM; aprende jugando contra otros agentes. En Medium y High "simulates possible continuations". Solo ve información pública (tablero, trash, DON!!, número de cartas en mano, mazo y Life, cartas reveladas). | Hasta OP-17. Cartas de EB05 "enabled, though they still need thorough testing". Lista de líderes no obtenida. | Análisis: no (solo repeticiones de la comunidad con línea temporal). Simulación: no. | Servicio web propietario y gratuito | "v17_2b, ~75% win rate over the previous version" (~3 sep 2026); luego v17_4c sustituido por v17_4d (~2 oct 2026). "600+ usuarios diarios". Sin Elo ni resultados contra humanos. | **[NV]** (la web devuelve 403 de Cloudflare y X devuelve 402; todo sale de fragmentos de buscador) |
| **SeaKing** ([optcg-vs-ai](https://seaking.gg/optcg-vs-ai.html), [sim](https://seaking.gg/sim.html), [learn](https://seaking.gg/learn-optcg.html), [game review](https://seaking.gg/optcg-game-review.html)) | Búsqueda: "chooses from the legal moves in the current position and considers how you can answer". Información justa: no ve tu mano, el orden de tu mazo, tus counters ni tu Life boca abajo. Algoritmo exacto no publicado. | Mazos predefinidos sacados de torneos, más cualquier lista legal. Colecciones soportadas no indicadas. | **Sí, en parte**. Botón de pista con la mejor jugada según su búsqueda. Game Review tras la partida: busca letal perdido turno a turno con la línea completa y califica decisiones frente a su IA. **Mira en retrospectiva viendo ambas manos** y solo lee partidas contra su bot ("cannot import a paper game or a screenshot"). Simulación: no. | Cerrado y gratuito. Sin página de términos (`/terms` da 404). Su robots.txt reserva la minería de texto y datos y prohíbe "rebuilding a competing card-game engine from this content". | Ninguna cifra de fuerza. Fiabilidad del Review según la propia web: 30 de 32 turnos completados (1 llegó al límite de ramas y 1 al de tiempo); ~6,4% de las victorias propuestas fallaron al revalidarlas. | **[V]** (3 niveles: Easy, Medium y Hard, más el modo Learn) |
| **OPlayTCG** ([play](https://oplaytcg.com/play), [changelog](https://oplaytcg.com/en/changelog), [meta-stats](https://oplaytcg.com/en/meta-stats)) | No divulgado. | Todo OP-17 y hasta ST-36, más 15 cartas de OP-18 y 15 de EB-05 (v1.8.1, 30 sep 2026). Modo Extended con cartas rotadas. | Solo Practice: árbol de jugadas manual con rebobinado. Estadísticas de meta del propio ladder. Simulación: no. | Cerrado y gratuito | Ninguna. "Solo vs AI" en Beta (Normal, Hard y Expert) desde la v1.6.0 (12 ago 2026). La v1.6.1 (25 ago) añadió costes opcionales y eventos [Counter]. | **[V]** |
| **OPTCG Topdeck** ([optcg.site](https://optcg.site/)) | Dice ofrecer "self-learning AI with move-by-move coaching". | "full 3,214-card database" | Coaching: no verificable. | Cerrado | Ninguna | El texto es [V]; lo que hace realmente es [NV] |
| **optcg-simulator.com** ([/play](https://optcg-simulator.com/play)) | Modo "vs AI" (Easy, Normal y Expert), sin detalles. Operador desconocido. | ? | ? | ? | Ninguna | La existencia es [V]; el resto es [NV] |
| **App de enseñanza de Bandai** ([iOS](https://apps.apple.com/us/app/-/id1631528594), [Android](https://play.google.com/store/apps/details?id=com.bandai.onepiece.card.gameteachingf)) | CPU guionizada (Free Battle). | 2 de los 4 mazos iniciales originales | No | Propietaria | "fairly easy to win" ([reseña](https://onepieceplayer.com/play-one-piece-card-game-online-optcgsim/)). Nota 3,4/5 con 314 reseñas. | [SC] |
| **BANDAI TCG+ / TCG+ D** ([anuncio](https://en.onepiece-cardgame.com/others/02_323.html), [lanzamiento](https://en.onepiece-cardgame.com/news/02_412.html)) | Una "solo play feature" sin descripción. | — | No consta | Bandai | — | **[NV]** |
| **Bots de tcg-engines** ([repo](https://github.com/TheCardGoat/tcg-engines)) | `heuristic`: "single-pass scoring, no search. Calibrated by feel". Además: `aggressive`, `value-ranked`, `greedy`, `first-legal`, `random` y `pass-only`. Todos con la etiqueta `informationPolicy: "oracle"`, pero el código revisado solo lee recuentos públicos del rival. | OP01–OP17, EB01–EB04, PRB02 y promos. Falta casi todo ST-22 a ST-36. | Hay arnés de benchmark; no hay análisis. | MIT | `heuristic` sustituyó a `value-ranked` con una mejora media emparejada de 0,455, IC95 [0,4325; 0,475], en 400 partidas (200 bloques). | [V]; la etiqueta oracle es [P] |
| **HeitorWestphal/optcg-ai** ([repo](https://github.com/HeitorWestphal/optcg-ai)) | Búsqueda a 1 jugada con una heurística de 7 términos sobre 26 rasgos agregados (del rival solo usa recuentos públicos), ajustada por hill climbing. Probó también rollouts MC, una red neuronal y UCT. | tcg-engines `e3200ba` con 2 parches, OP01–OP14, 2 mazos. | Arena con intervalos de Wilson | MIT, 3 commits (5 sep 2026) | Pesos ajustados contra su heurística base: 80,0% [72,0–86,2] con Mihawk verde y 60,0% [51,1–68,3] con Nami azul/amarilla. Contra aleatorio: 96,7% y 95,0%. **Los resultados de MC, la red y UCT se midieron con el motor roto y no se repitieron**. UCT usó solo 40 simulaciones con un techo de unos 400 comandos/s. La red empata estadísticamente tras self-play ε-greedy. | **[P]** |
| **khoile3009/SimOP** ([repo](https://github.com/khoile3009/SimOP)) | MCTS con determinización (`mcts.ts`, `determinize.ts`), evaluación aprendida (`weights.fitted.json`) y un analizador con barra de evaluación y búsqueda de líneas por turno (commits del 17 sep 2026). | **Solo OP01–OP03** (121, 121 y 123 cartas): es el Bloque 1, fuera de Standard. | Analizador: sí. Simulación: benchmark de bots. | **Sin licencia**, así que todos los derechos reservados | Ninguna publicada. 0 estrellas, 17 commits. | **[V]** |
| **Harsh-Patel73/One-Piece-Mono-Repo** ([repo](https://github.com/Harsh-Patel73/One-Piece-Mono-Repo)) | Motor en Python con self-play "AlphaZero-style" (`mcts.py` de 643 líneas, `network.py`, `trainer.py`). | OP01–OP06 (de OP07 en adelante, previsto) | Entrenamiento; sin análisis | Sin LICENSE | Ninguna. 0 estrellas, 36–37 commits, el último el 22 abr 2026. | [V] |
| **Jackten/optcg-puzzles** ([repo](https://github.com/Jackten/optcg-puzzles)) | Motor en TypeScript, una IA defensora y un solver acotado para puzzles de letal. | ? | Solver de letal | Sin licencia visible | Ninguna. 7 commits. | [V] |
| **t6fwv555y8-rgb/opctcg-companion** ([repo](https://github.com/t6fwv555y8-rgb/opctcg-companion)) | Superposición (HUD) en Rust/Tauri sobre OPTCGSim. Beam search y MCTS (200 iteraciones, rollouts de profundidad 12, determinización de la mano rival) sobre un motor de juguete de 383 líneas. | Motor de juguete | Win% y detección de letal en directo. Es un asistente durante la partida, no un analizador offline. | MIT | Ninguna. 29 commits (2–6 sep 2026). | [V] |
| **lukeweigand/TCG-Deckhand** ([repo](https://github.com/lukeweigand/TCG-Deckhand)) | Aleatorio, MCTS y minimax a profundidad 1–2 sobre un TCG genérico de juguete. | 50+ cartas de demostración | Las 3 mejores jugadas y win% | "All rights reserved" | Ninguna | [SC] |

### 1.2 Simuladores sin IA y otros proyectos de código

| Herramienta | ¿IA? | Notas | Verif. |
|---|---|---|---|
| **OPTCGSim** ([optcgsim.com](https://optcgsim.com/)) | No. Solo "Solo v Self". | El parche 1.43a (2 sep 2026) añade 18 cartas reveladas de EB05 y OP18. Tiene una opción "Don't Share match data", es decir, recoge datos de partidas. | Parche [V]; resto [SC] |
| OPBounty / TCG Matchmaking | No | Ladder sobre el simulador. Guarda repeticiones de los 200 mejores jugadores (≥3000 de bounty) y publica win rates semanales en Patreon ([optcg-mantra](https://github.com/travv/optcg-mantra), [winmatrix](https://opdecks.xyz/winmatrix), [vídeo](https://www.youtube.com/watch?v=1Mgjayevnmo)) | [SC] |
| corycunanan/optcg-sim ([repo](https://github.com/corycunanan/optcg-sim)) | Prevista ("AI opponents / bots" tras el hito M6) | ~2.500 cartas, 1.537 commits, activo en sep 2026 | [SC] |
| MOOgiwara ([repo](https://github.com/BAA-Studios/MOOgiwara)) | No consta | TS/Phaser, **AGPL-3.0** | [SC] |
| tagyne/onepiecetcg ([repo](https://github.com/tagyne/onepiecetcg)) | No | ISC, 13 commits | [SC] |
| DuelVoyager ([repo](https://github.com/NoahSullivan25/duelvoyager-one-piece-tcg-simulator)) | No consta | El repositorio solo contiene documentación | [SC] |
| OneSimulator ([web](https://onesimulator.slidingcodes.com/)), OPTCG Apps ([web](https://optcgapps.com/)), PulseTCG ([repo](https://github.com/AshwinVenki/pulse-tag), dice "play against an ai bot") | Desconocido | Páginas renderizadas con JavaScript | **[NV]** |
| akira9191/onepiece-card-simulator ([repo](https://github.com/akira9191/onepiece-card-simulator)) | Basada en reglas | Reglas parciales (sin counters) | [SC] |
| chanopk/OPTCG_ai ([repo](https://github.com/chanopk/OPTCG_ai)), paulvu2028/glnavigator ([repo](https://github.com/paulvu2028/glnavigator)) | LLM con RAG para preguntas de reglas | No juegan | [SC] |
| ColeAugusta/optcgAI ([repo](https://github.com/ColeAugusta/optcgAI)) | Optimizador estadístico de listas, **sin simular partidas** | MIT | [SC] |
| GustavoDallago/OPTCG-COACH ([repo](https://github.com/GustavoDallago/OPTCG-COACH)) | Un "Combat Simulator" que en realidad es una fórmula sobre recuentos de cartas | — | [SC] |
| Visores de repeticiones ([optcg-replay-viewer](https://github.com/LeoBacca/optcg-replay-viewer), [optcgreplay.com](https://optcgreplay.com/)), [optcg-deck-analyzer](https://github.com/SpookyCorgi/optcg-deck-analyzer) | No | Descriptivos | [SC] |
| Project Raftel, OPTCG Rush | Desaparecidos | Supuestos avisos de cierre de Bandai. Solo hay fuentes secundarias ([post en X](https://x.com/rjtriedtotweet/status/2089072603902476777), [Patreon](https://www.patreon.com/cw/optcgrush)). | **[NV]** |
| Sin cliente digital oficial completo de Bandai | — | [onepiece.gg](https://onepiece.gg/how-to-play-one-piece-card-game-online/), [Wikipedia](https://en.wikipedia.org/wiki/One_Piece_Card_Game) | [SC] |
| tcg.online (TheCardGoat) | **No** | One Piece figura como "Coming Soon" y "No meta activity yet". Solo ofrece archivos para LLM y un servidor MCP de consulta. | [V] |

**Herramientas de datos sin IA de juego.** Ninguna simula partidas ni evalúa posiciones:

| Herramienta | Qué ofrece | Verif. |
|---|---|---|
| OPlayTCG meta-stats | Ver sección 4 | [V] |
| [opdecks.xyz/winmatrix](https://opdecks.xyz/winmatrix) | 78.274 partidas por líder en OP17 ranked, actualizado el 10 sep | [SC] |
| [Egman power rankings](https://egmanevents.com/one-piece-op15-tcg-matchmaking-power-rankings) | Rankings de potencia | [SC] |
| [optcg.one/meta](https://www.optcg.one/meta) | Estadísticas de meta | [SC] |
| [devilfruittcg.gg/matchups](https://devilfruittcg.gg/matchups) | 238.854 partidas de OP15; algunas cifras son "projected" sin método explicado | [SC] |
| [opcartas](https://opcartas.com/pages/meta/matchup-matrix.html), [opmetabuilder](https://opmetabuilder.com/) | Matrices de emparejamientos | [SC] |
| [strawhatstats.com](https://strawhatstats.com/) | 1.630.833 partidas de simulador, sin indicar cuál | [V] |
| [Logia](https://apps.apple.com/app/id6743872871), [Log Pose](https://apps.apple.com/us/app/-/id6720759559), [OP.TCG](https://optcg.app/) | Apps de colección y registro de partidas | [SC] |

**Literatura académica.** No se encontró ningún artículo específico sobre IA para OPTCG [SC; es un resultado negativo de búsqueda]. Lo más cercano:
- [MCTS con determinización en conjunto para MTG](https://www.researchgate.net/publication/260583921)
- [Tesis de Godlewski sobre el LOTR LCG](https://www.bip.pw.edu.pl/content/download/59141/554245/file/PhDThesis_Konrad_Godlewski_20221010.pdf)
- [Explotabilidad de ByteRL](https://arxiv.org/pdf/2404.16689)
- La Kaggle Pokémon TCG AI Battle Challenge (sección 2)

### 1.3 Correcciones del verificador a los informes de partida

- **[R]** "SeaKing es un rival, no un analizador". En realidad ya tiene búsqueda de letal perdido y calificación de decisiones ([fuente](https://seaking.gg/optcg-game-review.html)).
- **[R]** "Los únicos bots que existen están en el repositorio del motor" y "el listón es bajo".
- **[P]** "El código abierto no pasa de heurísticas escritas a mano y no hay repositorio con RL". Es falso: existen Harsh-Patel73 (self-play estilo AlphaZero), opctcg-companion (MCTS determinizado) y SimOP (MCTS con analizador). Ninguno es ISMCTS, ninguno publica fuerza y ninguno juega el Standard actual.
- **[P]** Los "fracasos" de búsqueda y de la red neuronal en HeitorWestphal no son prueba de que la búsqueda no funcione: se midieron con el motor roto (2 DON!! en el primer turno y efectos resueltos al azar), con un presupuesto mínimo, y la red acabó empatando.

### 1.4 El listón concreto que nuestro bot debe superar

Esto es una propuesta de criterios, no un estándar externo. "Mejor que lo que existe" solo se puede demostrar con una batería que montemos nosotros, porque nadie publica cifras absolutas.

**A. Fuerza de juego, usando solo información justa (sin ver mano, Life ni orden del mazo rival)**
1. Superar un SPRT (α=β=0,05; H0: 0 Elo; H1: +35 Elo) contra `heuristic` y `aggressive` de tcg-engines, aunque estos sigan con la etiqueta oracle.
   - Al menos 6 mazos Standard posteriores a la prohibición de Mihawk, con ambos jugadores empezando.
   - El investigador propone como objetivo ≥65% en conjunto y ningún emparejamiento de mazos por debajo del 50%.
   - Ningún proyecto abierto ha demostrado esto todavía.
2. Superar la heurística de 7 términos de HeitorWestphal, reimplementada con su licencia MIT.
3. Superar una escalera de rivales reimplementados a partir de recetas publicadas (sección 3.5).
4. Jugar una serie manual prerregistrada contra **SeaKing en Hard** y **OPTCG AI en su dificultad máxima**, con las jugadas que proponga nuestro bot.
   - Debe ser manual: no tienen API y no se encontraron términos que permitan automatizar.
   - 100 partidas dan un IC de unos ±10 puntos, así que solo se detectan ventajas grandes.
   - OPTCG AI (PPO+MCTS) es el techo real. Un PIMC simple probablemente no le gane sin evaluación aprendida y sin un modelo de creencias.

**B. Análisis (donde podemos liderar)**
1. **Solver de letal con información justa**, que dé P(letal) según los counters y blockers que el rival podría tener.
   - Los listones medibles salen de las cifras que publica SeaKing sobre sí mismo: completar al menos ~94% de los turnos dentro del límite (ellos, 30/32) y fallar menos de ~6,4% de los letales propuestos (su tasa de fallo al revalidar).
   - Diferencia clave: SeaKing usa retrospectiva con información perfecta; nosotros usaríamos la información disponible en el momento.
2. **Win% por jugada candidata con intervalo de confianza y calibrado**, medido con Brier score y curva de fiabilidad. Nadie lo ofrece.
3. **Posiciones importadas**: logs de OPTCGSim u OPBounty, o una descripción tecleada. SeaKing solo analiza partidas contra su propio bot y el árbol de OPlayTCG es manual.
4. **Un informe de "qué tendría que tener el rival para castigar esto"**, por ejemplo P(el rival tiene 2 o más counters de 2k).
5. **Laboratorio de emparejamientos**: win rate de A contra B por self-play, con IC y separando quién empieza. Sirve para listas nuevas y para probar cambios de cartas. Todas las fuentes actuales agregan partidas humanas.
6. **Superar al analizador de SimOP en el Standard actual.** SimOP solo cubre el Bloque 1 y su código no se puede reutilizar porque no tiene licencia.
7. **Escalera Elo versionada y reproducible**, publicada para uso propio.

**C. Cobertura**
- Standard real: bloques 2 a 5, más las listas de excepción, más la lista de prohibidas con fechas de efecto.
- Los ST nuevos que faltan, sobre todo **ST30-001 Luffy & Ace**, líder del top 10 en OP-17.
- EB-05 desde el 30 oct y OP-18 desde el 20 nov de 2026.

**D. Abierto y local.** Todas las herramientas fuertes son servicios web cerrados.

**Conclusión honesta:** como rival de juego es poco probable superar a OPTCG AI sin un esfuerzo serio de RL. Como **motor de análisis** (el papel de Stockfish), nada de lo que existe ocupa ese hueco.

---

## 2. Estado del arte en IA para juegos de cartas con información oculta

### 2.1 Qué ha ganado en las competiciones

**Hearthstone AI Competition (SabberStone).** Reglas: 30 s por turno, un solo hilo y prohibido mirar la mano rival ([reglas](https://hearthstoneai.github.io/rules.html)).

| Año y track | Ganador (algoritmo, win rate) | 2.º | Margen | Verif. |
|---|---|---|---|---|
| 2018 Premade | PredatorMCTS (MCTS con predicción del rival); win rates no publicados ([resultados](https://hearthstoneai.github.io/results2018.html), [bots](https://hearthstoneai.github.io/botdownloads.html)) | — | — | [SC] |
| 2019 Premade | BotHeimbrodt, BFS podado + heurística, 57,66% | AlvaroAgent (MCTS), 55,22% | 2,44 pp | [SC] ([diapositivas 2019](https://hearthstoneai.github.io/files/slides/2019-Results-Hearthstone-AI-Competition.pdf)) |
| 2019 User deck | MCGSAgent (Monte Carlo Graph Search), 79,57% | 77,92% | 1,65 pp | [SC] |
| 2020 Premade | MyAgentSebastianMiller2 (Dynamic Lookahead), 72,34% | Team CopyCats, 70,91% | 1,43 pp | **[V]** ([diapositivas 2020](https://hearthstoneai.github.io/files/slides/2020-Results-Hearthstone-AI-Competition.pdf)) |
| 2020 User deck | DrunkenAggroWarriorAgent (DL), 65,47% | 63,23% | 2,24 pp | **[V]** |

Conclusiones de los organizadores [V]:
- En el track con mazo propio, la elección del mazo pesó más que la habilidad de juego.
- En 2020 "the meta got stale".

Trabajos relacionados:
- Choe y Kim (MCGS) ([ACM](https://dl.acm.org/doi/10.1109/CIG.2019.8848034))
- Dockhorn et al., predicción por bigramas ([Springer](https://link.springer.com/chapter/10.1007/978-3-319-91476-3_51))

**Legends of Code and Magic (LOCM), 2019–2022** ([Kowalski y Miernik 2023](https://arxiv.org/html/2305.11814v2)) **[V]**:

| Edición | Ganador | Win rate | 2.º | Margen |
|---|---|---|---|---|
| CEC 2019 | Coac (minimax a profundidad ≤3 con alfa-beta y poda) | 94,22% | 58,93% | 35,29 pp |
| COG 2019 | Coac | 89,88% | 87,84% | 2,04 pp |
| CEC 2020 | Coac | 86,07% | Chad (MCTS con predicción de mano) 79,10% | 6,97 pp |
| COG 2020 | Chad | 79,99% | Coac 74,68% | 5,31 pp |
| COG 2021 | DrainPowerAggressive (simulación plana de mi turno y la respuesta rival) | 78,72% | 77,96% | 0,76 pp |
| COG 2022 | **ByteRL** (RL de extremo a extremo con fictitious play) ([arXiv 2303.04096](https://arxiv.org/pdf/2303.04096)) | 84,41% | 75,00% | 9,41 pp |

Lecciones de la competición:
- **[V]** Las mayores mejoras en los agentes de búsqueda vinieron de la **detección de letal** y de la **ordenación y poda de jugadas**.
- **[V]** Se evaluó con la misma semilla y cada partida en espejo.
- [SC] La predicción de mano de ProphetCoac le restó fuerza porque consumía tiempo de búsqueda.

**ByteRL es explotable** **[V]**. Haluška y Schmid lo superan con 90,4%, 80,1% y 73,4% sobre conjuntos fijos de 32, 256 y 512 mazos ([arXiv 2404.16689](https://arxiv.org/html/2404.16689v1)). Matices: es solo la fase de combate, con conjuntos de mazos fijos, y no se pudo confirmar que se presentara en ALA 2024.

**Búsqueda encima de redes: Rubin 2026** **[V con matices]** ([abs](https://arxiv.org/abs/2609.06816), [html](https://arxiv.org/html/2609.06816)).
- Método: redes de política y valor aprendidas por imitación, más búsqueda sobre "mundos" muestreados del mazo rival. En cada mundo, beam search de 24 con 7 expansiones; después simula un turno de respuesta del rival y puntúa con la cabeza de valor.
- Resultado: **51,35% (IC95 [50,37; 52,33]) contra ByteRL en 10.000 partidas prerregistradas**. Sin búsqueda, 26,8%, así que la búsqueda aporta +24,6 pp.
- "beyond 32 worlds adding more does not increase performance". Usa 185 ms por jugada.
- Matices:
  - No fue una entrada oficial porque superaba el límite de memoria.
  - Solo cubre la fase de combate.
  - No publica código.
  - No está revisado por pares.
  - Es más exacto decir "a la par o ligeramente por encima de ByteRL" que "estado del arte".

**Tales of Tribute (IEEE CoG 2023–2026)**:
- 2023: el ganador mantenía 5 árboles MCTS con semillas distintas (determinización en conjunto), buscaba solo el turno actual y evaluaba con una heurística ajustada con algoritmo evolutivo; 10 s por turno ([arXiv 2305.08234](https://arxiv.org/html/2305.08234v3), [archivo 2024](https://github.com/ScriptsOfTribute/ScriptsOfTribute-CompetitionsArchive/blob/main/competition-2024-08-COG/README.md)) [SC].
- 2026: DeepSetsBlendBot (69,21%) y DeepSetsBot (68,24%) fueron 1.º y 2.º. Usan MCTS con red de valor DeepSets; el AUC es 0,797 al principio de la partida y 0,971 al final, de ahí que se mezcle con la heurística ([repo, MIT](https://github.com/DorukKaraman/deepsets-tales-of-tribute)). **[P]**: lo afirma el propio autor; el [archivo de los organizadores](https://github.com/ScriptsOfTribute/ScriptsOfTribute-CompetitionsArchive) solo cubre 2023–2025.

**Pokémon TCG AI Battle Challenge (Kaggle, 2026)** **[P]**:
- Fechas: Simulation del 16 jun al 17 ago de 2026 y Strategy hasta el 14 sep (según la [web oficial](https://ptcg-abc.pokemon.co.jp/) y [misprint.com](https://www.misprint.com/posts/pokemon-ai-tcg-competition-explained)).
- **Corrección:** según la web oficial, "No prize money will be provided for the Simulation Category". El dinero va a Strategy (30.000 $ a cada uno de los 8 primeros), más una segunda ronda.
- El 1.º de Simulation (1 de 6.807 equipos) habría usado Transformers de ~2,24M parámetros entrenados con PPO en 4 etapas, infiriendo mazo y mano del rival. **[NV]**: el detalle sale de fragmentos de buscador. El [writeup](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle-challenge-strategy/writeups/new-writeup-1784257142000) se renderiza con JavaScript y el [repositorio del ganador](https://github.com/yijieyuan/kaggle-pokemon-tcg) dice "Code will be available after the second round".
- Otros agentes destacados usan IS-MCTS determinizado con redes (hobrian/PTCG_AI_Kaggle, Martensiter/pokemon-tcg-ai-battle, solo según fragmentos de buscador). Que ganara un RL de extremo a extremo no significa que la búsqueda sobre.
- Hubo un ganador notable sin aprendizaje automático ([writeup](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle-challenge-strategy/writeups/mastering-pokmon-tcg-ai-without-machine-learning)) [SC].

**Lecciones transversales:**
1. Búsqueda limitada al turno más una buena evaluación ganó repetidamente; los rollouts de partida completa, no.
2. La evaluación aprendida ya es lo normal entre los ganadores recientes.
3. La búsqueda sobre redes supera a las redes solas (+24,6 pp en LOCM).
4. **Los márgenes en la cima son pequeños, de 1 a 9 pp.** Hacen falta miles de partidas emparejadas.

### 2.2 IA más fuerte documentada en otros juegos (contexto) [SC salvo indicación]

| Juego | Enfoque y evidencia |
|---|---|
| Hearthstone | ByteRL-HS gana todos los Bo5 contra un streamer top 10 del ladder chino ([arXiv 2303.05197](https://arxiv.org/abs/2303.05197)); MCTS con evaluación neuronal ([Świechowski 2018](https://arxiv.org/abs/1808.04794)); [Zhang y Buro 2017](https://www.semanticscholar.org/paper/Improving-hearthstone-AI-by-learning-high-level-and-Zhang-Buro/2a21d7863ce63022fd24cb1ca7dafdecdd690036); revisión de [Hoover et al. 2020](https://arxiv.org/pdf/1907.06562) |
| MTG | Forge usa heurísticas, no está entrenado ([wiki](https://github.com/Card-Forge/forge/wiki/AI)). XMage tiene "Mad" y quizá AIMCTS ([foro, NV](https://slightlymagic.net/forum/viewtopic.php?f=70&t=29965)). [Determinización en conjunto](https://eprints.whiterose.ac.uk/id/eprint/75050/1/EnsDetMagic.pdf). **MageZero** (MIT, PUCT con Transformer, sin determinización): 66% contra el minimax de XMage con UWTempo, frente a un 16% de base, dic 2025 [V] ([repo](https://github.com/WillWroble/MageZero)). Agente PPO para XMage ~50% (autoinformado, [repo](https://github.com/jackmaiorino/mage)). Jugar óptimamente a MTG es indecidible ([taxonomía 2024](https://arxiv.org/html/2410.06299v1)). Sparky de Arena: sin fuente primaria ([Draftsim](https://draftsim.com/sparky-decks-mtg-arena/)) |
| Pokémon TCG Pocket (DeNA) | Transformer de ~2M parámetros, acciones atómicas, 50M episodios; "Search-tree AI… impractical" ([Inven Global](https://www.invenglobal.com/articles/24133/how-reinforcement-learning-ai-tackles-the-complex-rules-of-pok%C3%A9mon-trading-card-game-pocket)). El año de la charla CEDEC no coincide entre fuentes |
| Yu-Gi-Oh! | ygo-agent (MIT, PPO con LSTM, 100M partidas) ([repo](https://github.com/sbl1996/ygo-agent)) |
| Legends of Runeterra | RL interno de Riot, "48% contra jugadores top" (blog de proveedor, [Anyscale](https://www.anyscale.com/blog/riot-games-and-deep-reinforcement-learning-in-gaming)) |
| Dou Di Zhu | [DouZero](https://arxiv.org/abs/2106.06135); [PerfectDou](https://proceedings.neurips.cc/paper_files/paper/2022/file/e26f31de8b13ec569bf507e6ae2cd952-Paper-Conference.pdf) (entrena con información perfecta y ejecuta con imperfecta); [AP-MCTS](https://www.ijcai.org/proceedings/2021/470) |
| Skat | Kermit: PIMC con evaluación aprendida e inferencia, a nivel experto ([Buro et al. 2009](https://www.cs.du.edu/~sturtevant/papers/skat.pdf)); inferencia basada en política ([Rebstock 2019](https://www.researchgate.net/publication/336087110_Policy_Based_Inference_in_Trick-Taking_Card_Games)) |
| Bridge | NooK (NukkAI) supera a 8 campeones en 67 de 80 series, solo como declarante ([The Batch](https://www.deeplearning.ai/the-batch/bridge-to-explainable-ai)) |
| Gwent | No se encontró fuente primaria |

### 2.3 Familias de algoritmos [SC, fuentes primarias citadas]

| Método | Mejor evidencia en cartas | Fallos típicos | Remedios | Encaje en OPTCG |
|---|---|---|---|---|
| **PIMC / determinización en conjunto** | Skat a nivel experto; en MTG compite con un jugador experto de reglas con menos de 1 s de CPU (~40 determinizaciones de 250 simulaciones); Rubin 2026 en LOCM | *Strategy fusion*, *non-locality* ([Long et al. 2010](https://cdn.aaai.org/ojs/7562/7562-13-11092-1-2-20201228.pdf)), *strategy hopping* ([AlphaZe\*\*](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2023.1014561/full)), fuga de semilla en nuestro motor | Replanificar tras cada revelación; respuestas del rival desde su propia información; ponderar mundos por creencia; [EPIMC](https://arxiv.org/abs/2408.02380); reutilizar árboles | **Primer bot (v1)** |
| **SO/MO-ISMCTS** ([Cowling, Powley y Whitehouse 2012](https://eprints.whiterose.ac.uk/id/eprint/75048/1/CowlingPowleyWhitehouse2012.pdf)) | Supera a la determinización en LOTR:C y Phantom; empata en Dou Di Zhu por explosión del factor de ramificación | Ramificación; SO es optimista sobre el rival | Progressive widening, abstracción de acciones, priors; MO o política en los nodos rivales | **Motor principal (v2)** |
| **CFR / ReBeL / Student of Games / Obscuro** | Póker, Liar's Dice, Scotland Yard, FoW chess ([ReBeL](https://arxiv.org/pdf/2007.13544), [SoG](https://arxiv.org/pdf/2112.03178), [Obscuro](https://openreview.net/pdf?id=afaakBqkvb); de Obscuro solo se leyó el resumen) | Hay que enumerar los estados de información por estado público, intratable con mazos de 50 y manos ocultas | Resolución de subjuegos por muestreo | Solo investigación |
| **AlphaZero / RL** | ByteRL, DouZero, PerfectDou, Kaggle Pokémon, MageZero | Explotable sin búsqueda; necesita millones de partidas | Búsqueda en el momento de decidir; tests con explotadores | **Fase 2**: redes dentro de la búsqueda |

**Antes de invertir en métodos pesados, conviene medir en OPTCG las tres propiedades de Long et al.** que explican cuándo funciona PIMC:
- correlación de hojas (con qué frecuencia los nodos terminales hermanos tienen el mismo resultado);
- sesgo (cuánto favorece el juego a un jugador);
- desambiguación (lo rápido que se revela la información oculta).

Rubin las midió para LOCM y eran favorables.

### 2.4 Técnicas que más importan [SC]

- **Descomponer las elecciones de subconjuntos.** En MTG, pasar a árboles binarios subió el win rate de 37,3% a 52,0% y redujo a la mitad el tiempo por jugada (Cowling et al. 2012).
- **Poda de jugadas dominadas** y [Hierarchical Portfolio Search](https://ojs.aaai.org/index.php/AIIDE/article/view/12787).
- **Bandits combinatorios** ([Ontañón 2017](https://arxiv.org/abs/1710.04805)).
- **Progressive widening** ([Chaslot et al. 2008](https://dke.maastrichtuniversity.nl/m.winands/publications.html)) y **Gumbel con sequential halving en la raíz**, útil con pocas simulaciones ([Danihelka et al., ICLR 2022](https://discovery.ucl.ac.uk/id/eprint/10167022/2/ivo_danihelka_thesis.pdf)).
- **Rollouts frente a evaluación estática.** En MTG, los rollouts aleatorios uniformes fueron "very weak". Los ganadores usaron búsqueda hasta el final del turno más evaluación. Recomendación: buscar hasta el final de nuestro turno, opcionalmente simular un turno de respuesta con una política barata, y evaluar.
- **Inferencia de la mano rival.** En Hearthstone, más del 95% de acierto en los turnos 3 a 5 ([Bursztein 2016](https://dl.acm.org/doi/10.1109/CIG.2016.7860416)). La inferencia basada en política mejoró a Kermit. Ventajas propias de OPTCG:
  - el Leader es visible desde el inicio y fija los colores;
  - el mazo tiene exactamente 50 cartas, con un máximo de 4 copias por número ([guía oficial](https://en.onepiece-cardgame.com/play-guide/)) [V];
  - las listas de torneo son públicas.
- **Paralelismo.** Paralelizar en la raíz equivale a determinizar en conjunto ([Chaslot, Winands y van den Herik 2008](https://link.springer.com/chapter/10.1007/978-3-540-87608-3_6)). En Node.js, los `worker_threads` no comparten el heap, así que lo práctico es paralelizar en la raíz (juicio de ingeniería, no sale de un artículo).
- **Presupuestos de tiempo de referencia:** Hearthstone, 30 s por turno; LOCM (Rubin), 185 ms por jugada; Tales of Tribute, 10 s por turno; MTG, ~3,4 s por jugada.

**Adaptación a OPTCG, con lo que hay en el motor vendorizado** [SC salvo `minSelections`, que es V]:
- **Paso de counter.** El motor lo plantea como un único prompt con `minSelections: 0, maxSelections: options.length`, es decir, 2^k subconjuntos. Hay que abstraerlo a {pasar} más los **conjuntos mínimos suficientes** para superar el poder del ataque, o descomponerlo en pasos atómicos en orden canónico.
- **`attachDon`.** Se adjunta un DON!! cada vez, lo que crea transposiciones. Conviene usar macroacciones del tipo "adjuntar k a X", con k en {0, el mínimo para alcanzar el umbral, +1, +2}, y una tabla de transposiciones o MCGS.
- **Comandos a filtrar.** `getLegalCommands` siempre incluye `concede`; hay que excluirlo de la búsqueda, junto con los comandos de juez.

### 2.5 Pila recomendada (TypeScript, motor basado en immer)

| Capa | Contenido |
|---|---|
| **L0. Adaptador del motor** (primero, y medido) | `SearchState` rápido: clonar el estado y llamar a `applyQueuedCommandMutation` + `drainResolutionQueue`, o `produce` con `setAutoFreeze(false)`, sin parches, sin `validateState`, sin animaciones y con historiales recortados. **Test diferencial contra `applyCommand` en ≥10.000 partidas aleatorias.** `determinize(view, belief, rng)` con semilla nueva que remuestree todas las zonas ocultas (mano rival, ambos mazos, **ambas pilas de Life**). Hashing Zobrist. Objetivo: decenas de miles de comandos/s por núcleo (juicio del investigador; por debajo de ~5.000/s ninguna búsqueda será fuerte). **Dato real:** HeitorWestphal midió un techo de ~400 comandos/s en `e3200ba` [V]. |
| **L1. Acciones** | Solver de letal primero; abstracción de counters; macroacciones de DON!!; ataques (atacante, objetivo) ordenados por heurística; nodos sí/no para blocker y trigger. |
| **L2-A. Bot v1, planificador PIMC por turno** | W=32 mundos; beam search de 16–32 por mundo; reacciones del rival con una política que solo ve su información; evaluación al final del turno; media entre mundos; **ejecutar solo el primer paso atómico y replanificar tras cada revelación**; paralelismo en la raíz con `worker_threads`. |
| **L2-B. Bot v2, SO-ISMCTS-PUCT** | Un árbol sobre nuestros conjuntos de información; priors de la heurística y después de la política aprendida; progressive widening; nodos rivales estilo MO; tabla de transposiciones o MCGS; Gumbel en la raíz; reutilizar el árbol. Se queda el que gane un SPRT a v1. |
| **L3. Evaluación** | Heurística (diferencia de Life, poder frente a umbrales, cartas activas o descansadas, blockers, DON!!, counters esperados en mano, cartas en mazo, términos por líder), ajustada por self-play (evolutiva o CLOP). Después, red de valor sobre conjuntos (DeepSets o un Transformer pequeño), opcionalmente con un crítico de información perfecta solo en entrenamiento al estilo PerfectDou, mezclada con la heurística en las fases en que la red es débil. Más tarde, cabeza de política entrenada con las visitas de la raíz. |
| **L4. Creencias** | Prior de arquetipo a partir de listas de torneo condicionadas al Leader; actualización bayesiana con las cartas reveladas; reponderación por la probabilidad de las acciones observadas del rival (Rebstock 2019). |
| **L5. Salida de análisis** | Win% por jugada candidata con IC entre mundos, variante principal del turno, "qué tendría que tener el rival", resumen de creencias e indicador de convergencia. |

### 2.6 Referencias clave

[ISMCTS](https://eprints.whiterose.ac.uk/id/eprint/75048/1/CowlingPowleyWhitehouse2012.pdf) · [Determinización en conjunto para MTG](https://eprints.whiterose.ac.uk/id/eprint/75050/1/EnsDetMagic.pdf) · [Long et al. 2010](https://cdn.aaai.org/ojs/7562/7562-13-11092-1-2-20201228.pdf) · [Skat/Kermit](https://www.cs.du.edu/~sturtevant/papers/skat.pdf) · [Rebstock 2019](https://www.researchgate.net/publication/336087110) · [EPIMC](https://arxiv.org/abs/2408.02380) · [ReBeL](https://arxiv.org/abs/2007.13544) · [Student of Games](https://arxiv.org/pdf/2112.03178) · [Obscuro](https://openreview.net/pdf?id=afaakBqkvb) · [AlphaZe\*\*](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2023.1014561/full) · [LOCM summary](https://arxiv.org/html/2305.11814v2) · [ByteRL LOCM](https://arxiv.org/pdf/2303.04096) · [ByteRL HS](https://arxiv.org/abs/2303.05197) · [Haluška y Schmid](https://arxiv.org/html/2404.16689v1) · [Rubin 2026](https://arxiv.org/html/2609.06816) · [ToT](https://arxiv.org/html/2305.08234v3) · [DouZero](https://arxiv.org/abs/2106.06135) · [AP-MCTS](https://www.ijcai.org/proceedings/2021/470) · [HPS](https://ojs.aaai.org/index.php/AIIDE/article/view/12787) · [CMAB](https://arxiv.org/abs/1710.04805) · [MCTS paralelo](https://link.springer.com/chapter/10.1007/978-3-540-87608-3_6) · [AIVAT](https://ojs.aaai.org/index.php/AAAI/article/view/11481) · [AV-AIVAT](https://arxiv.org/abs/2608.06362) · [Fishtest maths](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html) · [Taxonomía CCG](https://arxiv.org/html/2410.06299v1)

---

## 3. Protocolo de evaluación recomendado

### 3.1 Comprobaciones de corrección (antes de medir fuerza)

1. **Ruta rápida frente a ruta oficial:** estado idéntico en ≥10.000 partidas aleatorias.
2. **Recuentos tipo perft** de jugadas legales en posiciones fijas.
3. **Cobertura de cartas.** Para cada carta de los mazos de prueba, un test de comportamiento real, no los tests generados.
   - Motivo: los tests por carta del motor no pueden fallar ([#223](https://github.com/TheCardGoat/tcg-engines/issues/223)) [V].
   - Unos ~1.387 IDs de carta tienen tests escritos a mano, de un total de ~2.282, así que alrededor del 40% del catálogo no tiene test propio [V].
4. **Batería de puzzles tácticos** (letales) con el porcentaje resuelto.
5. **Puertas específicas del motor** [SC; inspección local del investigador]:
   - **Fuga de semilla.** Toda la aleatoriedad depende de `config.seed`: barajado inicial con `${seed}:${seat}` (`state.ts:735`), mulligan con `${seed}:${seat}:mulligan` (`engine/commands.ts:304`) y barajados por efecto con seed + turno + secuencia. Si la búsqueda copia el estado real, **puede ver los robos futuros**. El determinizador debe cambiar la semilla y remuestrear todas las zonas ocultas.
   - **`shuffleDecks` está a `false` por defecto** (`normalizeConfig`). Hay que activarlo en el arnés.
   - **Las semillas dependen del asiento.** Al cambiar de asiento cambia el orden del mazo, lo que rompe las partidas duplicadas. Hay que pre-barajar por mazo en el arnés o usar el mazo como clave de la semilla.

### 3.2 Diseño emparejado (semillas duplicadas)

- Se fija (par de mazos, asiento, semilla de barajado) y se juega dos veces, **intercambiando qué bot controla cada lado**. Además se cambia quién empieza. Resultado: **4 partidas por cada (semilla, par de mazos)**, con barajados idénticos por mazo. Es el método de LOCM ("same random seed… every match was mirrored") [V].
- **La unidad de análisis es el par o bloque.** Fishtest analiza los resultados de pares con GSPRT pentanomial ([Fishtest maths](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html)).
- Varianza: Var(media del par) = σ²(1+ρ)/2. Una correlación negativa dentro del par, que es lo que consigue anular la suerte, reduce las partidas necesarias. Hay que estimar ρ con un piloto.

### 3.3 Estadística: SPRT, Elo e intervalos

- **Intervalos de Wilson al 95%.** Ejemplos: 55 de 100 da [45,2%; 64,4%]; 550 de 1.000, [51,9%; 58,1%]; 5.500 de 10.000, [54,0%; 56,0%].
- **SPRT de Wald.** LLR = W·ln(p1/p0) + L·ln((1−p1)/(1−p0)). Con α=β=0,05 se para al salir del intervalo ±2,94.
- **Elo.** Puntuación esperada = 1/(1+10^(−Δ/400)). Equivalencias: 55% ≈ +35 Elo; 52,5% ≈ +17; 52% ≈ +14.
- **Varios bots a la vez:** modelo de Bradley–Terry o logístico con términos de agente, asiento (ventaja de empezar) y emparejamiento de mazos.

**Partidas necesarias** (sin empates y sin ganancia por emparejamiento; cifras recalculadas por el verificador, [V]):

| Win rate real vs 50% | Elo | n fijo (α=0,05 bilateral, potencia 0,80) | n fijo (potencia 0,95) | SPRT α=β=0,05, n esperado |
|---|---|---|---|---|
| 57% [F] | +49 | ~401 | ~663 | ~270 |
| **55%** | +35 | **783** | 1.294 | **~527–529** |
| 52,9% | +20 | 2.331 | 3.857 | ~1.574 |
| 52,5% | +17 | 3.137 | 5.192 | ~2.118 |
| 52% | +14 | 4.903 | 8.116 | ~3.311 |
| 51% | +7 | 19.620 | 32.481 | ~13.248 |

La fila del 57% está calculada en esta fusión con las mismas fórmulas. La duración esperada del SPRT es máxima cuando el efecto real cae entre las dos hipótesis: unas 860 partidas para el test de 50% contra 55% [SC].

**Reglas de aceptación propuestas:**
- **Cambios rutinarios:** H0 Elo ≤ 0 frente a H1 Elo ≥ +20, unas 1.574 partidas de media.
- **Cambios grandes:** H1 = +35 Elo, unas 527.
- Presupuestos de iteraciones fijos para que sea reproducible, al estilo de las STC y LTC de Fishtest ([wiki](https://github.com/official-stockfish/fishtest/wiki/Creating-my-first-test)): 1.000–2.000 iteraciones en tests rápidos y 10.000 en largos, con revisiones periódicas a tiempo de reloj.
- No se pudieron comprobar los límites SPRT por defecto de Fishtest [NV].

### 3.4 Reducción de varianza adicional

- **AIVAT** ([Burch et al., AAAI 2018](https://ojs.aaai.org/index.php/AAAI/article/view/11481)) es una variable de control insesgada que usa la función de valor en los nodos de azar. En póker redujo la desviación típica un 85%, es decir, unas 44 veces menos partidas [SC]. En OPTCG, los nodos de azar son los robos, las cartas de Life, los triggers y las búsquedas en mazo.
- **AV-AIVAT** ([arXiv 2608.06362](https://arxiv.org/abs/2608.06362), 6 ago 2026, preprint) informa de una mediana de 74 veces menos manos [V; no revisado por pares].

### 3.5 Escalera de rivales

1. Aleatorio.
2. Codicioso a 1 jugada.
3. Basado en reglas (al estilo Forge), más `heuristic`, `aggressive` y `value-ranked` de tcg-engines, y la heurística de HeitorWestphal (MIT).
4. Alfa-beta a profundidad 3 al estilo Coac.
5. Simulación plana del turno al estilo DrainPower.
6. MCTS con determinización en conjunto (al estilo Cowling y ToT 2023).
7. Planificador PIMC (v1).
8. SO-ISMCTS (v2).
9. **PIMC tramposo** (ve la información oculta), como cota superior. La distancia entre el bot y su gemelo tramposo estima lo que aún nos cuesta la información imperfecta.

**Mazos:** entre 6 y 10 mazos del meta Standard **posterior al 12 oct 2026** (sin OP14-020), más espejos. Se informa por emparejamiento y en conjunto.

**Criterios de "mejor que lo existente":**
- (a) SPRT superado contra toda la escalera.
- (b) Serie manual prerregistrada contra OPTCG AI y SeaKing.
- (c) Más puzzles resueltos que los rivales de referencia.
- (d) Win% calibrado (Brier).

### 3.6 Robustez y versionado

- **Tests con explotador.** ByteRL perdía entre el 73% y el 90% contra explotadores [V]. Hay que entrenar o ajustar a mano un explotador contra el bot congelado.
- **Variedad de estilos de rival**, no solo self-play.
- **Calibración** del win% en partidas reservadas.
- **Versionado de resultados por revisión del motor.** Cada sincronización con el repositorio original que cambie el comportamiento invalida los SPRT y Elo guardados. El propio repositorio etiqueta sus promociones con `engineRevision` y `cardCatalogHash` [V].

### 3.7 Sobre "≥200 bloques emparejados" (supuesto del plan)

- La cifra viene de `promotions/current.json` del repositorio original: 200 bloques = 400 partidas, para un efecto enorme (mejora media emparejada de 0,455) [V].
- Como regla fija es dudosa:
  - Con bloques de 2 partidas, 400 partidas detectan un ~57% (+49 Elo) con potencia 0,80, sin contar lo que aporta el emparejamiento [F].
  - Con bloques de 4 partidas (800 en total), un ~55% (+35 Elo) [F].
  - Para efectos de +20 Elo, típicos en mejoras incrementales, hacen falta entre ~1.600 y ~2.300 partidas.
- **Recomendación:** usar SPRT sobre los resultados de los pares, con un mínimo de ~100–200 bloques solo como suelo (evita parar demasiado pronto por varianza), y definir claramente qué es un "bloque".

---

## 4. Fuentes de datos: qué usar, cómo y restricciones legales

### 4.1 Resumen

| Uso | Fuente recomendada | Cómo | Restricción | Verif. |
|---|---|---|---|---|
| Listas, frecuencia por Leader, emparejamientos y win rates | **API de Limitless Tournament Platform** (`https://play.limitlesstcg.com/api`) | JSON sin clave; ~50 peticiones cada 5 min; caché local | Cubre torneos online (sobre todo de simulador), no los majors curados. No dice quién empezó. | [V] |
| Listas de majors (top 16) | onepiece.limitlesstcg.com | HTML fácil de parsear, con robots.txt permisivo | Sin API. **Aún no hay resultados de la temporada 2.** | [V] |
| Datos de cartas (fuente oficial) | Cardlist oficial de Bandai + punk-records (JSON semanal) | Por colección; contrastar los iconos de bloque con la web japonesa | "may not be reproduced without permission"; datos © Bandai | [V] |
| Legalidad | Páginas oficiales de prohibidas y de excepciones de bloque | `banlist.json` mantenido a mano, más un detector semanal de cambios | — | [V] |
| Win rate empezando primero o segundo | OPlayTCG meta-stats | **Captura manual** o pedir permiso | robots.txt bloquea ClaudeBot, GPTBot, etc. | [V] |
| Precios | optcgapi.com | JSON | Sin licencia ni términos; un solo mantenedor | [SC]/[F] |

### 4.2 API de Limitless (detalle) [V]

- **Documentación:** [developer.html](https://docs.limitlesstcg.com/developer.html), [torneos](https://docs.limitlesstcg.com/developer/tournaments), [juegos](https://docs.limitlesstcg.com/developer/games).
- **Endpoints:** `GET /games`, `/games/{id}/decks` (necesita clave), `/tournaments?game=OP&format=&limit=&page=`, `/tournaments/{id}/details`, `/standings`, `/pairings` y webhooks.
- **Claves.** "With the exception of the /decks endpoint… you do NOT need an API key". Las claves "are only given out to public-facing projects that have a legitimate use-case". Un proyecto privado se queda sin `/decks`, así que hay que categorizar los mazos por el ID del Leader.
- **Límite.** Cabecera `ratelimit-policy: "50-in-5min"` observada el 4 oct 2026. La documentación no da una cifra, así que puede cambiar. CORS `*` y ETag.
- **One Piece** ([/api/games](https://play.limitlesstcg.com/api/games)): formatos STANDARD y EXTRA, plataformas CAM y SIM.
- **Volumen desde el 28 ago 2026:** 76 torneos, 2.152 inscripciones y 19 eventos de 32 o más jugadores. El campo `format` es `null` en 72 y `"EXTRA"` en 4. Hay que tratar `null` como "probablemente Standard", sin darlo por seguro.
- **Ejemplo ChinoizeCup #116:** 119 jugadores, todos con lista, y 306 emparejamientos con las claves `{round, phase, table, player1, player2, winner}`. **No hay campo de quién empezó** ([pairings](https://play.limitlesstcg.com/api/tournaments/6ab4e651e905c1db687493fe/pairings)). `deck.id` es el ID del Leader, que identifica el arquetipo sin ambigüedad.
- **Prohibiciones propias de cada torneo** en `details.bannedCards`. Por ejemplo, Rumble league #11 (1 oct) incluye OP14-020. Los ChinoizeCup no lo declaran aunque ya no hay Mihawk, así que **el estado posterior a la prohibición hay que inferirlo evento a evento**.
- **Términos de uso** ([play.limitlesstcg.com/tos](https://play.limitlesstcg.com/tos), actualizados el 28 feb 2021): no tienen ninguna cláusula sobre scraping o automatización [V]. Operador: Schulz, Robin und Hombach, Lydia GbR, de Herne.
- **Página de metajuego, sin API** ([decks?game=OP](https://play.limitlesstcg.com/decks?game=OP)), ver sección 5.5. Los límites de fechas de cada grupo de colección no se pueden verificar [NV].

### 4.3 onepiece.limitlesstcg.com [V]

- Torneos grandes con listas del top 16 ([torneos](https://onepiece.limitlesstcg.com/tournaments)), ranking de líderes ([decks](https://onepiece.limitlesstcg.com/decks)), [listas](https://onepiece.limitlesstcg.com/decks/lists) y una base de cartas.
- Las páginas de lista (p. ej. [6697](https://onepiece.limitlesstcg.com/decks/list/6697)) llevan atributos `data-id` y `data-count`, fáciles de leer.
- [robots.txt](https://onepiece.limitlesstcg.com/robots.txt) permite todo; `/tos` da 404; el [aviso legal](https://limitlesstcg.com/legal) nombra a Robin Schulz (Gdańsk).
- **Frescura:**
  - Los últimos majors completados son del 25–26 jul 2026, en formato OP-16.
  - Ningún evento EN de la temporada 2 (Zagreb, Malmö, Utrecht, EU Finals, Athens, Prague, London, NA Finals Dallas) tiene resultados todavía.
  - El primer major de OP-17 listado es el **Regional de Monterrey, el 24 oct 2026**.
- No aparecen los CS japoneses; gumgum.gg sí los lista [SC].

### 4.4 Datos de cartas

- **Bandai oficial** ([cardlist OP-17](https://en.onepiece-cardgame.com/cardlist/?series=569117)) [V/SC]:
  - HTML con un `<dl class="modalCol">` por impresión; incluye icono de bloque, Counter, efecto, etc.
  - Pie de página: "All images, text and data on this website may not be reproduced without permission." [V]
  - **La base inglesa tiene errores de icono de bloque:** 91 de las 119 numeraciones de OP-05 aparecen con icono 1, mientras la base japonesa ([OP05-003](https://www.onepiece-cardgame.com/cardlist/?freewords=OP05-003)) muestra 2 [V].
- **[Coko7/vegapull](https://github.com/Coko7/vegapull)** [V]: CLI en Rust que hace scraping de las webs oficiales (7 idiomas) e incluye `block_number`. **GPL-3.0**. v1.3.0 del 21 ago 2026.
- **[buhbbl/punk-records](https://github.com/buhbbl/punk-records)** [V]: JSON precompilado de vegapull, con commits automáticos semanales (el último, el 2 oct 2026) y unos 4.908 JSON en `english/`. Código **AGPL-3.0**; datos © Bandai. [coko7/vegapull-records](https://github.com/coko7/vegapull-records) está desfasado desde abr 2025 [SC].
- **[ditshej/one-piece-cards-api](https://github.com/ditshej/one-piece-cards-api)** [V]: API REST en Laravel con servidor MCP; **MIT** (Raphael Weiss); último commit el 30 sep 2026. `cards:resolve` entiende `4xST01-011` y `4 OP17-113` y valida las reglas de mazo. La API alojada (`op-cards-api.ditshej.ch`) necesita token y dio un error de TLS desde nuestro proxy [NV]. No tiene datos de prohibidas ni de legalidad.
- **[optcgapi.com](https://www.optcgapi.com/)**:
  - Comprobado de nuevo el 4 oct 2026 en esta fusión [F]: `/api/allSets/` devuelve **22 colecciones**: OP-01 a OP-13, OP14-EB04, OP15-EB04, OP-16, OP-17, EB-01 a EB-03, PRB-01 y PRB-02. La portada aún dice "OP-01 through OP-15" y la página About "OP01 - OP12": texto desfasado.
  - [SC]: 35 mazos iniciales (ST-01 a ST-36 **sin ST-29**); precios diarios de TCGplayer; **sin número de bloque, erratas, legalidad ni prohibidas**; sin licencia ni términos; un único mantenedor en un VPS que pide no hacer "an insane amount of API calls" ([documentación](https://optcgapi.com/documentation), [about](https://optcgapi.com/about/general), [actualizaciones](https://optcgapi.com/about/updates/)).
  - **Es el origen de los errores de signo del motor** (sección 6).

### 4.5 Estadísticas de meta

- **OPlayTCG** ([meta-stats](https://oplaytcg.com/en/meta-stats)):
  - "36,261 games analyzed · Updated October 3, 2026 · Going first wins 47.9% of games" [V, a través del índice del buscador].
  - Muestra win rate ± IC, separación primero/segundo, win rate ajustado por rival y tasa de juego. Filtros de 7 días, 30 días o todo.
  - Los datos son del **ladder de su simulador**, no de torneos.
  - Ejemplos por líder [NV]: Sabo OP13-004 con 54,3% (51,0% empezando primero y 57,3% segundo); Luffy OP17-079 con 39,9% empezando primero y 56,2% segundo.
  - [robots.txt](https://oplaytcg.com/robots.txt) [V]: `Disallow: /api/` para todos y `Disallow: /` para GPTBot, ClaudeBot, anthropic-ai, CCBot, etc.
  - Términos en [/en/legal/terms](https://oplaytcg.com/en/legal/terms), supuestamente del 16 ago 2026 [NV].
  - **Uso recomendado: captura manual o pedir permiso o una exportación al operador.**
- **Otras fuentes:**

  | Fuente | Qué es | Verif. |
  |---|---|---|
  | [opdecks.xyz/meta](https://opdecks.xyz/meta) | Mezcla JP y EN | [SC] |
  | [onepiecedb.io](https://onepiecedb.io/) | Envíos de la comunidad | [P] |
  | [strawhatstats.com](https://strawhatstats.com/) | Simulador sin identificar ni rango de fechas | [V] |
  | devilfruittcg, optcg.one | El robots.txt de optcg.one prohíbe `/api/` | [SC] |
  | Card Kaizoku ([op-match-stats](https://github.com/greshbasic/op-match-stats)) | Un archivo de muestra dio 404 | [NV] |

### 4.6 Formatos de lista de mazo [SC]

| Formato | Ejemplo | Dónde se usa |
|---|---|---|
| OPTCGSim `NxID` | `1xOP16-022`, `4xOP16-034` (Leader incluido) | "Copy to Sim" de Limitless ([JS](https://onepiece.limitlesstcg.com/build/assets/decklist-2eb85c1b.js)); constructor de Egman ([deckbuilder](https://deckbuilder.egmanevents.com/)) |
| `N ID` | `1 OP01-001` | Envío de listas a Limitless ([documentación](https://docs.limitlesstcg.com/player/decklists)) |
| "Copy as Text" de Limitless | Solo nombres, sin IDs | Evitarlo |
| JSON de la API de Limitless | Listas estructuradas por tipo | Standings |
| `dg=` de onepiecetopdecks | `1nOP16-079a4n…` | Enlaces de [onepiecetopdecks](https://onepiecetopdecks.com/deck-list/japan-op17-deck-list-the-worlds-strongest-warriors/) |

El formato propio de OPTCGSim no se ha podido confirmar en una fuente primaria [NV].

### 4.7 Restricciones legales y de términos de uso

| Fuente | Postura |
|---|---|
| **Bandai** | Todo © Bandai, "may not be reproduced without permission" [V]. No se encontró una política de contenido de fans para el juego de cartas [NV]. |
| **API de Limitless** | Vía sancionada si se respeta el límite. Los términos no hablan de automatización [V]. |
| **onepiece.limitlesstcg.com** | robots.txt permite todo, sin términos de uso. Scraping moderado y amable, sin permiso explícito [V]. |
| **gumgum.gg** ([términos](https://gumgum.gg/terms-of-service), GLHF LLC, 27 mar 2024) | **Prohíben explícitamente** bots, scripts, scrapers y minería de datos [V]. Solo uso manual ([eventos](https://gumgum.gg/one-piece/events)). |
| **OPlayTCG** | robots.txt bloquea a los agentes de IA [V]. |
| **onepiecetopdecks** | CAPTCHA de SiteGround ante curl; sin términos encontrados [SC]. Preguntar al dueño. |
| **Egman** ([archivo](https://egmanevents.com/one-piece)) | robots.txt bloquea bots de IA [SC]. Solo histórico. |
| **SeaKing** | robots.txt reserva la minería de texto y datos y prohíbe "rebuilding a competing card-game engine from this content" [V, según el verificador]. **No extraer nada de SeaKing.** |
| **optcgapi** | Sin licencia ni términos [SC]. |
| **vegapull** | GPL-3.0 si se incorpora su código [V]. |
| **punk-records** | Código AGPL-3.0 [V]. |
| **ditshej** | MIT [V]. |
| **SimOP, Harsh-Patel73, Jackten** | Sin licencia: no copiar su código [V]. |
| **Productos cerrados** (OPTCG AI, SeaKing, OPlayTCG) | Sin API. No se encontraron términos que permitan jugar contra ellos de forma automatizada, así que **solo partidas manuales** [V/NV]. |
| **Cierres de simuladores por parte de Bandai** | Solo hay fuentes secundarias (un post en X y un vídeo de YouTube que no se pudo leer) [NV]. Una herramienta local, privada y offline está mucho menos expuesta que un servicio alojado (inferencia). |

**Higiene recomendada:**
- Guardar texto de cartas, imágenes y listas en una caché local ignorada por git, sin redistribuir nada.
- Respetar robots.txt y los límites de cada sitio.
- No descargar ni empaquetar imágenes.
- Esto no es asesoramiento legal.

### 4.8 Proceso recomendado

1. **Ingesta diaria** desde la API de Limitless: listado de torneos y, para cada uno nuevo, `/details`, `/standings` y `/pairings`, guardado en SQLite. Son unas 3 peticiones por torneo; los 76 eventos de OP-17 suponen unas 230 peticiones (~25 min).
2. **Épocas de formato:**
   - **E0:** OP-17 con Mihawk legal. **Empieza el 13 ago 2026, no el 28 ago**: la API tiene 14 eventos de OP-17 con 682 inscripciones antes del 28 ago [V].
   - **E1:** tras la prohibición.
   - Un evento cuenta como E1 si declara OP14-020 en `bannedCards`, o si es del 24 sep o posterior, tiene 32 o más jugadores y ninguna inscripción con OP14-020, o si es del 12 oct o posterior.
   - Se descartan los eventos con `format == "EXTRA"` o con `[EGB]` en el nombre.
   - Ojo: la época de OP-17 es corta. OP-18 sale el 20 nov y Limitless ya lista "Regional Santiago OP18" el 5 dic [V].
3. **Validación** de cada lista contra punk-records (`english/index/cards_by_id.json`) y la capa de legalidad (bloques 2–5, listas de excepción, prohibidas, parejas prohibidas, 50 cartas, máximo 4 copias salvo excepciones como OP16-042). Se rechazan los eventos con listas ilegales.
4. **Métricas por época:**
   - cuota de cada Leader;
   - conversión a top cut;
   - win rates de partida con intervalo de Wilson;
   - matriz de emparejamientos entre líderes;
   - **frecuencia de inclusión y media de copias de cada carta por Leader**, que es el prior de creencias del bot.
5. **Poblaciones separadas:** Swiss Bo1 online frente a top cut Bo3 en papel, y OPlayTCG frente a torneos.
6. **Lista de prohibidas:** un `banlist.json` mantenido a mano, con `{card_id, kind, pair_with, effective_from, announced, source_url}`, y un detector semanal que compruebe las páginas EN y JP de restricciones y la de excepciones de bloque.

---

## 5. Formato competitivo actual y calendario europeo

### 5.1 Colecciones en inglés y diferencia con Japón [V]

Fuentes: [boosters EN](https://en.onepiece-cardgame.com/products/?subcategory=boosters&page=1) (y `&page=2`), [boosters JP](https://www.onepiece-cardgame.com/products/?subcategory=boosters&page=1), [boosters EN (otra vista)](https://en.onepiece-cardgame.com/products/boosters/).

| Colección | Salida EN | Salida JP | Diferencia |
|---|---|---|---|
| OP-13 *Carrying On His Will* | 7 nov 2025 | 23 ago 2025 | ~11 semanas |
| OP14-EB04 *The Azure Sea's Seven* | 16 ene 2026 | OP-14: 22 nov 2025; EB-04: 31 ene 2026 | ~8 semanas |
| EB-03 *Heroines Edition* | 20 feb 2026 | 25 oct 2025 | ~17 semanas |
| OP15-EB04 *Adventure on Kami's Island* | 3 abr 2026 | 28 feb 2026 | ~5 semanas |
| OP-16 *The Time of Battle* | 12 jun 2026 | 30 may 2026 | 13 días |
| **OP-17 *The World's Strongest Warriors*** (última) | **28 ago 2026** | 22 ago 2026 | 6 días |
| **EB-05 *Heroines Edition vol.2*** | **30 oct 2026** | 31 oct 2026 | EN un día antes |
| **OP-18 *The Dominance of God*** ([página](https://en.onepiece-cardgame.com/products/op18.html)) | **20 nov 2026** | 21 nov 2026 | EN un día antes |

- **No hay ninguna colección exclusiva de Japón hasta OP-17.** EB-04 no existe en inglés como producto suelto: sus cartas salieron dentro de OP14-EB04 y OP15-EB04 [V].
- Bandai anunció el lanzamiento simultáneo mundial en [topics/013](https://en.onepiece-cardgame.com/topics/013.php) y el alineamiento de premios en [topics/025](https://en.onepiece-cardgame.com/topics/025.php) [V].
- **Mazos iniciales EN recientes** [SC] ([decks](https://en.onepiece-cardgame.com/products/?subcategory=decks)): ST-29 (16 ene 2026), ST-30 *Luffy & Ace* (12 jun 2026), ST-31 a ST-36 (31 jul 2026) y SD-01 (18 sep 2026).
- **Cuándo es legal una colección nueva** [V] ([Tournament Rules Manual](https://en.onepiece-cardgame.com/pdf/tournament_rules_manual.pdf?20260116)):
  - Eventos de nivel 1: desde el día de salida, incluida la presentación.
  - **Eventos de nivel 2 y 3** (Store Championships, Regionals, Treasure Cups, Finals): **7 días después**.
  - Las promos con número nuevo, como P-163, son legales en nivel 2 y 3 siete días después del primer evento que las reparte.
  - Ojo: el PDF enlazado con `?20260116` tiene en la cabecera "Last Updated: October 17, 2025".
  - Fechas derivadas para regionales [F]: OP-17 legal desde el 4 sep, **EB-05 desde el 6 nov** y **OP-18 desde el 27 nov**.
- **Idioma** [V]: en Europa, el Leader y el mazo principal deben ser cartas en inglés o francés ([norma de idioma](https://en.onepiece-cardgame.com/rules/announcements/lang_card_rule.php)). El japonés no es legal.

### 5.2 Rotación por bloques [V]

- **Anuncio** del 23 jul 2025 ([topics/013](https://en.onepiece-cardgame.com/topics/013.php)): desde el **1 abr 2026** hay dos formatos.
  - **Standard:** abr 2026 – mar 2027 admite los bloques **②–⑤**, sin el ①; abr 2027 – mar 2028 admitirá los bloques ③–⑥.
  - **Extra:** del bloque ① en adelante.
- **En la región EN rige desde la misma fecha** ([topics/025](https://en.onepiece-cardgame.com/topics/025.php); la [página de Regionals T2](https://en.onepiece-cardgame.com/events/regional-season2-26-27.html) dice "Standard Regulation was applied on April 1, 2026").
- **La siguiente rotación es en abril de 2027**, cuando sale el bloque 2 (OP-05 a OP-08, EB-01, ST-10 a ST-14 y las promos de ese bloque).
- La regla 2-15 de las CR 1.2.1 dice que el símbolo de bloque "does not affect gameplay". La legalidad se valida fuera del motor de juego.

**Excepciones** ([blockicon-card](https://en.onepiece-cardgame.com/rules/blockicon-card/) y [news/blockicon-card.html](https://en.onepiece-cardgame.com/news/blockicon-card.html)) [V]. Son **tres secciones**, con 55 entradas y 53 números únicos:

**(a) Números de Super Parallel Rare**, legales en general (actualizado el 21 ago 2026). Desde abril de 2026, las SPR nuevas llevan el bloque "X". Son 37 números:
- EB01-006, EB02-061, EB03-061, EB04-044
- OP01-016, OP01-120, OP02-013, OP03-122, OP04-083
- OP05-069, OP05-074, OP05-119, OP06-118, OP06-119, OP07-051, OP08-118
- OP09-004, OP09-051, OP09-093, OP09-118, OP09-119, OP10-119, OP11-118, OP12-118
- OP13-118, OP13-119, OP13-120, OP14-119, OP15-118
- OP16-063, OP16-065, OP16-073
- OP17-005, OP17-022, OP17-062, OP17-112, OP17-118

**(b) Cartas tratadas como bloque ④**, legales del 1 abr 2026 al 31 mar 2029. Esta lista está fechada el **23 jul 2025**, no el 21 ago 2026. Son 15 ([topics/018](https://en.onepiece-cardgame.com/topics/018.php)):
- OP01-039, OP01-055, OP02-005, OP02-068
- OP03-008, OP03-044, OP03-048, OP03-072, OP03-097
- OP04-016, OP04-077, OP04-096
- ST01-011, ST02-007, ST06-008

**(c) Cartas con bloque actualizado y reimpresas** (21 ago 2026): OP01-016 Nami, OP04-016 Bad Manners Kick Course y **EB04-061 Monkey.D.Luffy**. Esta última solo figura en esta sección, así que un validador que solo use las dos primeras listas la perdería.

Una guía de terceros generaliza que cualquier reimpresión con un bloque nuevo vuelve a ser legal ([bountytcg](https://www.bountytcg.app/en/blog/one-piece-tcg-rotation-block-system)). **Bandai solo lo respalda para las cartas de sus listas: hay que usar las listas explícitas.**

**Bloques por colección** (base oficial EN, contrastada con la japonesa) [V en los puntos clave]:

| Bloque | Contenido | Estado en Standard (abr 2026 – mar 2027) |
|---|---|---|
| 1 | OP-01 a OP-04; ST-01 a ST-09; promos como P-001 | **No legal**, salvo las listas (a), (b) y (c) |
| 2 | OP-05 a OP-08; EB-01; **ST-10** (17 de 19 cartas); ST-11 a ST-14; parte de ST-15 a ST-20 | Legal; rota en abril de 2027 |
| 3 | OP-09 a OP-12; EB-02; PRB-01 y PRB-02 (cartas nuevas); ST-21 a ST-28 | Legal |
| 4 | OP-13, OP14-EB04, OP15-EB04, EB-03, ST-29 | Legal |
| 5 | **OP-16**, OP-17, ST-30, cartas nuevas de ST-31 a ST-36 | Legal |
| X | Super Parallel Rares | Legal |

- **OP-16 está impreso como bloque 5, no 4** (OP16-001 aparece con 5 tanto en EN como en JP) [V]. No se encontró ningún texto oficial que lo explique; que los bloques sigan ahora la temporada de abril a marzo es una inferencia.
- **ST-10 es bloque 2, así que no rotó** [V]. Por eso la prohibición de ST10-001 Law importa en Standard.
- No se pudieron comprobar los bloques de EB-05, OP-18 y P-163 porque aún no están en la base.

### 5.3 Lista de prohibidas (región EN), a 4 de octubre de 2026 [V]

Fuentes: [restriction.html EN](https://en.onepiece-cardgame.com/news/restriction.html), [restriction.html JP](https://www.onepiece-cardgame.com/news/restriction.html) (coinciden) y [anuncio del 24 sep](https://en.onepiece-cardgame.com/news/restriction-261001.html). **Desde el 1 abr 2026 hay una sola lista para Standard y Extra** ([topics/025](https://en.onepiece-cardgame.com/topics/025.php)).

| Tipo | Carta | Bloque | Notas |
|---|---|---|---|
| Prohibida | **OP14-020 Dracule Mihawk (Leader)** | 4 | Anunciada el 24 sep 2026, **efectiva el 12 oct 2026**, incluidas las paralelas. Bandai dará un Leader sustituto, **P-163 Dracule Mihawk**, en futuros eventos. Motivo: "significantly restricts the viability of Leader cards with the {Slash} attribute". |
| Prohibida | OP06-047 Charlotte Pudding | 2 | Anunciada el 16 mar 2026, efectiva el 1 abr 2026 ([topics/029](https://en.onepiece-cardgame.com/topics/029.php)) |
| Prohibida | OP06-086 Gecko Moria | 2 | |
| Prohibida | OP06-116 Reject | 2 | |
| Prohibida | ST10-001 Trafalgar Law (Leader) | 2 | Afecta a Standard |
| Prohibida | OP03-040 Nami (Leader) | 1 | Solo afecta a Extra. Prohibida el 30 ago 2025 ([topics/019](https://en.onepiece-cardgame.com/topics/019.php)) |
| Restringidas | Ninguna | | "There are currently no cards in this category." |
| Pareja prohibida | OP11-040 Monkey.D.Luffy + OP11-067 Charlotte Katakuri | | |
| Pareja prohibida | OP11-040 Monkey.D.Luffy + OP08-069 Charlotte Linlin | | |
| Pareja prohibida | OP07-115 "I Re-Quasar Helllp!!" + EB04-058 Borsalino | | Anunciada el 31 mar 2026, efectiva el 10 abr 2026 en NA, EU, LATAM y OC ([restriction-260501](https://en.onepiece-cardgame.com/news/restriction-260501.html)) |

- Hoy (4 oct) hay **5 prohibidas**; desde el 12 oct serán **6**. Las dos cifras que dan los informes son correctas, cada una en su fecha.
- **Desprohibidas el 1 abr 2026:** OP07-045 Jinbe, EB01-059 Kingdom Come, ST06-015 Great Eruption, OP02-024 Moby Dick, OP03-098 Enies Lobby y OP02-117 Ice Age. Las cuatro del bloque 1 solo sirven en Extra.
- **Bandai revisa normalmente la lista dos veces al año** ("once after the conclusion of Championship Season 1 in Japan, and once after the World Championship"), con posibles cambios de urgencia.
- Histórico: [restriction-archive](https://en.onepiece-cardgame.com/news/restriction-archive.html). Fuente secundaria: [deltiasgaming](https://deltiasgaming.com/one-piece-tcg-banlist/) [SC].

### 5.4 Reglas y documentos [V]

- **Comprehensive Rules v1.2.1, "Last updated: 8/28/2026"**, 28 páginas ([PDF](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20260828), [índice de reglas](https://en.onepiece-cardgame.com/rules/)).
- Tournament Rules Manual: figura con fecha 16 ene 2026. Official Rule Manual: 23 jun 2023.
- FAQ por colección, la más reciente del 21 ago 2026 ([FAQ](https://en.onepiece-cardgame.com/rules/faq/)) [SC].
- Las erratas recientes se publican como avisos (OP-16 el 29 may 2026, etc.); la [página de erratas](https://en.onepiece-cardgame.com/rules/errata_card/) no se actualiza desde may 2025 [SC]. No se comprobó si la cardlist muestra el texto con la errata aplicada [NV].

### 5.5 Meta

**a) Última foto de Limitless en formato OP-16** (eventos EN del ~20 jun al 26 jul 2026; [EU](https://onepiece.limitlesstcg.com/decks?format=OP16&region=eu)) [V]. Son **cuotas de puntos de top cut, no de todos los inscritos**:

| Leader | Carta | % de puntos (EU) | % de puntos (NA) [SC] |
|---|---|---|---|
| Luffy verde/azul | OP16-022 | 27,45% | 13,9% |
| Enel morado | OP15-058 | 21,93% | 22,6% |
| Nami azul/amarilla | OP11-041 | 21,00% | 26,0% |
| Rosinante morado/amarillo | OP12-061 | 10,50% | 9,5% |
| Barbanegra negro/amarillo | OP16-080 | 6,61% | 14,5% |
| Lucy rojo/azul | OP15-002 | 2,02% | 3,3% |
| Mihawk verde | OP14-020 | 1,09% | 1,1% |

**b) Limitless online, grupo "OP16"**, que ya incluye líderes de OP-17 ([decks?game=OP](https://play.limitlesstcg.com/decks?game=OP)) [V]:
- Totales: 156 torneos, 5.227 jugadores y 11.631 partidas.
- Mihawk (OP14) 11,08% de cuota y 52,62% de victorias; Luffy (OP16) 6,73%; Teach (OP16) 5,95%; Sabo (OP13) 5,87%; Enel (OP15) 5,66% y 53,67%; Rocks (OP17) 5,26%; Kaido (OP17) 3,52%; Luffy (OP17) 2,77%.

**c) Mihawk en eventos online** [V]:

| Evento | Fecha | Inscripciones | Con Mihawk | Notas |
|---|---|---|---|---|
| Road to Finals Utrecht | 30 ago | 240 | **88**, el más jugado | Le siguen OP13-004 (33) y OP17-039 (29) |
| ChinoizeCup #113 | 22 sep | 64 | 12 | |
| ChinoizeCup #115 | 28 sep | 128 | **0** | |
| ChinoizeCup #116 | — | 119 | **0** | |

**d) OP-17 en papel (septiembre de 2026): solo datos de la comunidad** [P]:

| Evento | Jugadores | Ganador | Verif. |
|---|---|---|---|
| Regional de Utrecht, 5–6 sep ([onepiecedb](https://onepiecedb.io/tournaments/2026+Regional+Utrecht/2026-09-07); fechado allí el 7 sep) | 1.024 | **Luffy negro** (OP17-079), Svinci. Top 8 con Mihawk ×2, Sabo, Enel, Hancock, Robin y Ace. | [V] |
| Regional de Atenas, 12 sep ([onepiecedb](https://onepiecedb.io/tournaments/2026+Regional+Athens/2026-09-12)) | 224 | Enel morado | [SC] |
| Regional de Praga, 26–27 sep ([onepiecedb](https://onepiecedb.io/tournaments/2026+Regional+Prague/2026-09-27)) | 1.024 | Nico Robin morado/amarillo (OP09-062) | [SC] |
| NA Finals T1, Dallas, 18–19 sep ([onepiecedb](https://onepiecedb.io/tournaments/2026+North+America+Championship+Finals+Season+1/2026-09-19)) | 1.095 | Mihawk verde | [SC] |

- Agregado del top 8 en Europa (24 puestos): Mihawk 6, Enel 6, Robin 4, Kaido 2 [SC].
- [opdecks.xyz/meta](https://opdecks.xyz/meta), mezclando JP y EN (380 listas, 23 ago – 20 sep): Mihawk verde 20,3%, Robin morado/amarillo 10,8%, Rocks azul (OP17-039) 8,4%, Sabo rojo/azul 7,4%, Luffy negro 7,4%, Enel 6,6%, Ace rojo (OP16-001) 5,8%, Kaido morado (OP17-058) 5,0%, Hancock azul/amarilla (OP14-041) 5,0%, Luffy & Ace rojo/verde (ST30-001) 3,2% [SC].
- [strawhatstats](https://strawhatstats.com/), con partidas de simulador de origen y nivel desconocidos: Mihawk 52,1%, Sabo 53,0%, Robin 54,6%, Rocks 52,0%, Enel 48,6% [V en las cifras; base débil].

**e) Meta esperado tras la prohibición** (opinión, no datos). [Cardsrealm, 28 sep 2026](https://onepiece.cardsrealm.com/en-us/articles/optcg-september-banlist-review-goodbye-mihawk) cita a Straw Hat Stats: Mihawk tenía un 71,6% contra Rocks y un 73,9% contra Shanks verde. Se espera que suban **Rocks, Shanks y Zoro** [V en las cifras citadas].

**f) Mazos recomendados oficiales para OP-17** (28 ago 2026; [feature/deck](https://en.onepiece-cardgame.com/feature/deck/)): Linlin amarillo, Luffy negro, Kaido morado, Rocks azul, Shanks verde y Newgate rojo [SC]. Sirven como listas iniciales.

**No verificado:**
- el ganador de las EU Finals T1. Un fragmento citaba a Fabian Godglück con Sakazuki, pero Limitless lo da como ganador de la Treasure Cup de Utrecht del 12 jul 2026;
- los resultados de Londres (3–4 oct);
- cualquier cuota de OP-17 calculada sobre todos los inscritos.

### 5.6 Calendario europeo verificado

**Regionals temporada 2** ([página oficial](https://en.onepiece-cardgame.com/events/regional-season2-26-27.html)). Todos son Standard. Invitación a Finals para el top 16, o el top 32 con 800 o más jugadores [V]; solo cuentas TCG+ de NA y EU [SC].

| Fecha | Lugar | Organizador | Evento paralelo [SC] | Colecciones legales [F] | Verif. |
|---|---|---|---|---|---|
| 15–16 ago | Zagreb | Magic Omens | Treasure Cup | Hasta OP-16 o 17 | [SC] |
| 22–23 ago | Malmö | Victory Road | Treasure Cup | — | [SC] |
| 5–6 sep | Utrecht, Jaarbeurs (BCG Fest) | CS-International | Treasure Cup | OP-17 | [V] |
| 12 sep | Atenas | Athens Collectibles | Treasure Cup | OP-17 | [SC] |
| 26–27 sep | Praga | LR Event Management | Treasure Cup | OP-17 | [V] |
| 3–4 oct | Londres (Lee Valley) | Organized Play Events | Extra Grand Battle | Hasta OP-17, **Mihawk legal** | [V] |
| 7–8 nov | Oporto | Victory Road | Extra Grand Battle | OP-17 + EB-05; sin Mihawk | [V] |
| **14–15 nov** | **Burdeos, Pullman Bordeaux Lac** | **PECO** | Extra Grand Battle | OP-17 + EB-05; sin Mihawk | **[V]** |
| 21–22 nov | Bristol | Organized Play Events | Extra Grand Battle | OP-17 + EB-05 (OP-18 aún no) | [V] |
| **28–29 nov** | **Elx (Alicante), España** | Victory Road | Extra Grand Battle | **OP-18 legal** (desde el 27 nov) | [V] |
| 5–6 dic | Múnich | NoHEROES | Treasure Cup | Con OP-18 | [V] |
| **5–6 dic** | **Utrecht, Beatrix Theater** (Jaarbeursplein 6A) | **Olli Baba** | Treasure Cup | Con OP-18 | **[V]** |
| **12–13 dic** | **Rungis, Espace Jean Monnet** (Parc Icade, 47 Rue des Solets). La web lo lista como "Paris". | **PECO** | Treasure Cup | Con OP-18 | **[V]** |

- **Corrección propia:** el informe de formato decía que Elx no tendría OP-18. Aplicando la regla de 7 días (salida el 20 nov, legal el 27 nov), **sí lo tendrá**. Sería el primer regional europeo con OP-18 [F, inferencia aritmética].
- **"Utrecht" es ambiguo:** hubo regionales allí el 11 jul (T1, 788 jugadores), el 5–6 sep (Jaarbeurs) y el 5–6 dic (Beatrix Theater) [V].

**Estructura y otros eventos:**
- **EU Finals T1:** 5–6 sep 2026, Jaarbeurs Utrecht ([página](https://en.onepiece-cardgame.com/events/26-27_Finals_Season_1.html)) [SC].
- **EU Finals T2:** **16–17 ene 2027, ExCeL London** (BCG Fest), con LCQ. **El top 6 recibe invitación al Mundial.** Inscripción de invitados desde el 25 oct 2026 a las 9:00 GMT / 10:00 CET ([página](https://en.onepiece-cardgame.com/events/26-27_Finals_Season_2.html)) [V].
- **NA Finals T2:** 9–10 ene 2027, Orange County Convention Center (top 8) [V].
- **Final mundial:** **20–21 mar 2027** ([Asia-English](https://asia-en.onepiece-cardgame.com/events/championship-26-27.html)). Fecha [V]; lugar ("Japón") [NV].
- Estructura del campeonato ([championship-26-27](https://en.onepiece-cardgame.com/events/championship-26-27.html)) [SC]: todos los torneos oficiales son ahora solo presenciales; las invitaciones de cada temporada solo valen para sus Finals.
- Formato de ronda [SC]: Suizo Bo1 de 30+5 minutos; top cut Bo3 de 60+10.
- **Store Championship T2** ([storecs_october](https://en.onepiece-cardgame.com/events/storecs_october.html)) [SC]: del 1 al 31 oct 2026, NA/EU, Standard, 32 o 64 jugadores, sin top cut. Invitaciones según asistencia: 1 (1–23 jugadores), 2 (24–47), 4 (48–64) u 8 (65+).
- **Store Tournament 2026 Vol. 4** ([02_452](https://en.onepiece-cardgame.com/events/02_452.html)) [SC]: del 1 oct al 31 dic, Bo1, inscripción por Bandai TCG+. Inscripción de jugadores desde el 17 sep (octubre), 17 oct (noviembre) y 17 nov (diciembre). También: Pirates Party Vol. 3 y Extra Grand Battle for Stores ([eventos](https://en.onepiece-cardgame.com/events/)).
- **Treasure Cups** ([dic](https://en.onepiece-cardgame.com/events/treasure-cup-dec-2026.html), [ago](https://en.onepiece-cardgame.com/events/treasure-cup-august-2026.html)) [SC]: solo presenciales, Bo1 de 35+5. Inscripción para los eventos de enero desde el 25 oct y para los de febrero desde el 29 nov. [Extra Grand Battle grande](https://en.onepiece-cardgame.com/events/extra-grand-battle-l-2026.html) [SC].

### 5.7 Consecuencias para el simulador

1. **Regla de legalidad Standard (EN) hasta el 31 mar 2027:** el bloque de la carta está entre 2 y 5, **o** su número está en las listas (a), (b) o (c); **y** no está prohibida; **y** el mazo no contiene una pareja prohibida.
2. Aplicar la prohibición de Mihawk con fecha. En repeticiones de septiembre, OP14-020 sigue siendo legal.
3. Preparar la rotación de abril de 2027.
4. Tomar los bloques de la base oficial, colección a colección, y contrastarlos con la japonesa. Las consultas solo por `block_icon[]` devolvieron 0 resultados para los bloques 1 a 3 [SC].
5. Usar el texto inglés con erratas y comprobar el motor frente a la v1.2.1.

---

## 6. Estado de tcg-engines y forma recomendada de depender de él

### 6.1 Estado del repositorio

| Aspecto | Hallazgo | Verif. |
|---|---|---|
| Datos básicos | MIT ("Copyright (c) 2025 TheCardGoat"), 37 estrellas, 18 forks, 6 issues abiertos (todos de One Piece), 220 PR cerrados, **0 tags y 0 releases** ([releases](https://github.com/TheCardGoat/tcg-engines/releases)) | [V] |
| Estado declarado | One Piece "In progress": "a deep rules engine and full card database are implemented; the public simulator is still being built out". Lorcana, Cyberpunk, Gundam y FaB figuran como "Feature complete". | [V] |
| Prioridad del mantenedor | eduardomoroni, 13 sep 2026, en [#218](https://r.jina.ai/https://github.com/TheCardGoat/tcg-engines/issues/218): "the OP engine is not fully implemented. We changed priorities and we're focusing on Grand Archive and Flesh and blood at the moment" | [V] |
| npm | `@tcg/op-engine`, `op-cards`, `op-types` y `op-utils` dan **404** ([registro](https://registry.npmjs.org/@tcg%2fop-engine)). Los paquetes están en versión `0.0.0`, con metadatos de plantilla, exportan código TS fuente y dependen de `link:../../../agnostic-simulator/...`, así que **solo funcionan dentro del monorepo**. | 404 [V]; resto [SC] |
| Historial | **Reescrito.** `main` tiene 21 commits desde `a01843c`, "Initial public engine export" (12 jun 2026). La rama `backup/pre-public-reset-20260612-154040` guarda 387 commits (10 jul 2025 – 12 feb 2026) **sin ancestro común**. Los merges antiguos (p. ej. [PR #19](https://github.com/TheCardGoat/tcg-engines/pull/19)) ya no son alcanzables. | [V] |
| Modelo de publicación | El repositorio canónico es el privado `TheCardGoat/the-card-goat-online`. El público recibe exportaciones "Public sync YYYY-Www" ([ejemplo](https://github.com/TheCardGoat/tcg-engines/commit/f972f4eec686c61748c2f63ff75a93a7a3395330), [PR #222](https://github.com/TheCardGoat/tcg-engines/pull/222)). La W39 se exportó a mano desde un portátil y renombró 3.944 archivos (de carpetas por colección a carpetas por tipo), **lo que rompe las rutas de importación profundas**. Las exportaciones sobrescriben el contenido que solo existe en el público. | [SC] |
| Cadencia | Doce commits en `submodules/one-piece` entre el 4 jul y el 24 sep. Hueco de 6 semanas (W31–W36). Ninguno desde el 24 sep (el `53a7941` del 1 oct solo toca el README). Los PR de W26 y W38 se cerraron sin fusionar ([PRs](https://github.com/TheCardGoat/tcg-engines/pulls?q=is%3Apr)). | [SC] |
| CI de One Piece | En verde (ejecución #33) ([workflow](https://github.com/TheCardGoat/tcg-engines/actions/workflows/ci-one-piece.yml)) | [SC] |

### 6.2 Issues y PR relevantes ([issues abiertos](https://github.com/TheCardGoat/tcg-engines/issues?q=is%3Aissue%20state%3Aopen))

| # | Tema | Estado en `53a7941` | Verif. |
|---|---|---|---|
| [#217](https://github.com/TheCardGoat/tcg-engines/issues/217) | 1.972 tests por carta nunca se ejecutaban | Corregido en W37 (`vite.config.ts`), pero el issue sigue abierto | [SC] |
| [#218](https://github.com/TheCardGoat/tcg-engines/issues/218) | El primer jugador recibía 2 DON!! en el turno 1 | **Corregido** en `state.ts:896-899` ("6-4-1"); el issue sigue abierto | [V] |
| [#219](https://github.com/TheCardGoat/tcg-engines/issues/219) | ¿Habrá OP15 a OP17? | Hecho en W39 (119 definiciones por colección) | [SC] |
| [#223](https://github.com/TheCardGoat/tcg-engines/issues/223) | `validateCardAbility` es un stub (`assert.ok(true)`) | **Sigue presente** (`card-behavior-harness.ts`, línea ~398). Según el issue (18 sep): 2.065 archivos, 1.596 `test.skip` y ~469 que pasan trivialmente. Según el investigador tras W39: 1.278 de 2.162 son `test.skip`. Las pruebas reales están en `tests/cards/` (1.390 archivos). | Issue [V]; recuento posterior [SC] |
| [#224](https://github.com/TheCardGoat/tcg-engines/issues/224) | Faltaba asignar poder base literal (OP17-008 Jozu) | Añadido en W39 (`setBasePower`) | [SC] |
| [#225](https://github.com/TheCardGoat/tcg-engines/issues/225) | `setBasePowerFrom` no programa la caducidad en duraciones de varios turnos | **Latente**: ninguna de las 6 cartas que lo usan lo activa | [SC] |
| [PR #216](https://github.com/TheCardGoat/tcg-engines/pull/216) | Búsqueda a mano condicionada a huecos de Character libres (171 cartas) | Cerrado sin fusionar; aparentemente corregido en privado | [SC] |
| [PR #228](https://github.com/TheCardGoat/tcg-engines/pull/228) | Signos menos perdidos al importar de optcgapi | Fusionado el 24 sep. 56 cartas afectadas, **13 con el efecto invertido** (p. ej. OP17-011 daba +4000 al rival; el Leader Sabo OP13-004 ganaba +1000 en vez de perder 1000). Causa: normalización del U+2212. | [V] |
| [PR #229](https://github.com/TheCardGoat/tcg-engines/pull/229) | 11 errores de texto en OP15, EB04, OP16 y OP17, 3 de ellos de comportamiento (OP15-017 perdía [Blocker], EB04-025 apuntaba a la mano equivocada, OP17-087 perdía su [On Play]) | Fusionado el 24 sep | [SC] |

**Que estas correcciones de la comunidad sobrevivan a la próxima exportación no se puede verificar todavía** [NV].

### 6.3 Fidelidad a las reglas

- **El motor sigue las CR 1.2.0 (16 ene 2026); la vigente es la 1.2.1 (28 ago 2026)** [V]. El export para LLM de tcg.online lo reconoce: "local copy: 1.2.0" ([rules.txt](https://tcg.online/one-piece/llm/rules.txt)).
- **Cambios de la 1.2.1 confirmados en el PDF** [V]:
  - 2-10-3: el valor del Counter puede diferir del impreso por efectos.
  - 2-10-4: con varios Counters, solo se aplica el mayor.
  - 6-6-1-1-1: los efectos [End of Your Turn] y [End of Your Opponent's Turn] solo se activan y resuelven una vez.
  - Se reestructura el paso de counter 7-1-3.
  - **No se ha verificado si el motor ya se comporta así** [NV], y no se pudo obtener el PDF oficial de la 1.2.0.
- **Lo que declara el propio motor** [SC]:
  - 18 archivos de tests de reglas, uno por capítulo de las CR (unos 285–328 tests).
  - Reglas que declara no implementadas: detección de bucles infinitos (11-1), triggers encadenados (8-6-1-1) y cadenas de reemplazo apiladas.
  - Inventario de comportamiento por carta con "0 pending" y una puerta de cobertura.
  - Auditoría de self-play `coverage-r71` (19 sep): 68 de 68 partidas completas, 0 comandos ilegales y "Hidden-information leakage: None".
  - Todo es **autoinformado**.
- **Datos de cartas sacados de optcgapi**, con una tasa de error demostrada [V] y 5.993 URLs de optcgapi aún en el paquete [SC].
- **Sin capa de legalidad** [V]: `validateDeckForFormat` solo acepta `"standard"` (50 cartas, colores y máximo 4 copias). Acepta OP01–OP04 y las cartas prohibidas. No hay datos de bloques ni de prohibidas.
- **Cobertura de cartas** [V]:
  - Unas 2.392 fichas: OP01–OP17 (119–123 cada una), EB01–EB04 (61–62), PRB02 (18) y P (22).
  - **Leaders de mazos iniciales: solo ST-01.** Faltan ST-10, ST-13 y ST-21 en adelante, incluido **ST30-001 Luffy & Ace**.
  - Personajes de ST: solo st21, st26, st27, st31 y st32.
  - Sí están los líderes del meta: OP17-039, OP17-058, OP17-079, OP14-020, OP09-062, OP13-004, OP15-058, OP14-041 y OP16-001.
- **Sin juego real:** One Piece no está abierto en tcg.online ([inicio](https://tcg.online/), [juegos](https://tcg.online/games), [matchmaking](https://tcg.online/one-piece/matchmaking), [meta](https://tcg.online/one-piece/meta)) [V].
- **Hallazgos técnicos relevantes para la búsqueda:**
  - `applyCommand` usa `produceWithPatches` de immer y ejecuta `validateState` en cada comando [V].
  - Los historiales crecen sin límite [SC].
  - Las semillas, el paso de counter y `attachDon` se describen en las secciones 2.4 y 3.1.
  - Rendimiento de referencia: unos 400 comandos/s según HeitorWestphal en `e3200ba` [V].

**Veredicto:** buen punto de partida, mejor probado que cualquier otro motor abierto de One Piece conocido, pero hay que tratarlo como **"bueno, pero hay que verificarlo"**: regresión propia sobre las cartas de los mazos estudiados, una lista local de erratas y parches, y una capa de legalidad propia.

### 6.4 Licencia y propiedad intelectual [V]

- **MIT cubre el código de TheCardGoat, no los textos, nombres, imágenes ni el texto de las reglas de Bandai.**
- El repositorio contiene:
  - texto de cartas (incluidos los `*.i18n.ts`);
  - **dos copias literales de las CR** en `submodules/one-piece/.agents/skills/op-rules/`;
  - enlaces directos a imágenes de optcgapi (sin archivos de imagen).
- Lorcana tiene un `DISCLAIMER.md`; One Piece no [SC].
- tcg.online declara ser "independent, unofficial" y "not affiliated" [V].
- Para un uso privado en casa el riesgo es bajo. **Si el repositorio se hiciera público:** excluir `.agents/` (el motor no lo necesita en ejecución), añadir un aviso similar al de Lorcana y no empaquetar nunca imágenes.

### 6.5 Forma recomendada de depender del motor

Mantener el enfoque actual: **una instantánea vendorizada con `git archive` más una cola local de parches** (`/home/user/cold2sport/scripts/sync-engine.sh` y `/home/user/cold2sport/vendor/tcg-engines/UPSTREAM.md`), reforzada así:

1. **Fijar por SHA del commit y por hash del árbol.** El hash del árbol sobrevive a una reescritura del historial. Para `53a7941` [SC]:

   | Ruta | Hash del árbol |
   |---|---|
   | `submodules/one-piece` | `c38fcd8a2ad3c4e1cfc967dee4dcd77c66831383` |
   | `bot-core` | `442b1614699fb134de085324862285c263e16cc8` |
   | `engine-core` | `c618a8bbeaabcbec0d6bdf90edb1cf4fae996bd0` |
   | `protocol` | `611d17291c25420a89e069cd33d8724c2983361e` |
   | `card-model` | `d2310dfb6b50f66f7bee6b7f1feedc7f0c3361c3` |
   | `typescript-config` | `ee61e3ae70beb529e409d48f1d02054ce13c2311` |

   Registrar también el ID de la exportación privada (W39: `6145dbf5…`). **Corregir `UPSTREAM.md`**: solo lista cuatro paquetes agnósticos, pero el script también vendoriza `typescript-config` [SC].
2. **Un fork personal como archivo y vía para enviar PR.** Subir cada SHA fijado a una rama del fork (p. ej. `pin/2026-10-01-53a7941`) para que no lo borre la recolección de basura del original. No fusionar nunca `main` del original.
3. **Evitar:**
   - un submódulo git: el puntero se rompe con una reescritura y arrastra los 10 juegos;
   - git subtree: necesita un historial continuo;
   - npm: no hay nada publicado.
4. **Sincronizar solo en los límites "Public sync" y a propósito.** Seguir los cambios por el feed [commits/main.atom](https://github.com/TheCardGoat/tcg-engines/commits/main.atom). En cada sincronización:
   - ejecutar `pnpm run engine:check` del original y nuestro `pnpm run check`;
   - ejecutar un **test diferencial de repeticiones de referencia** (semillas y mazos fijos, comparando registros de acciones y ganadores);
   - si el comportamiento cambia, subir la revisión del motor e invalidar los resultados SPRT y Elo guardados.
5. **Aislar las importaciones profundas** en `/home/user/cold2sport/packages/opbot/src/engine/internals.ts`, con un test de contrato que falle de forma visible si una exportación mueve las rutas.
6. **Disciplina con la cola de parches:**
   - cada parche (p. ej. `vendor/patches/0001-permanent-effects-action-prefilter.patch`) lleva su motivo;
   - antes de aplicarlo, comprobar si el original ya lo corrigió de otra forma (como pasó con #216);
   - las correcciones de reglas se envían como PR al original y el parche local se retira cuando el arreglo aparece en una exportación.
7. **Seguir nosotros los huecos de reglas:** CR 1.2.1, #225, legalidad, erratas de optcgapi, EB-05 (30 oct) y OP-18 (20 nov), ST-22 a ST-36.
8. **Higiene de propiedad intelectual:** repositorio privado, sin imágenes y sin redistribuir texto.

Otros enlaces del repositorio: [README en el commit fijado](https://github.com/TheCardGoat/tcg-engines/commit/53a79413c58678b1c50dde57e71de5c123132716), [W39](https://github.com/TheCardGoat/tcg-engines/commit/471722ceee82600ebb9218093c785bc9f37b2463), [strategy-registry.ts](https://github.com/TheCardGoat/tcg-engines/blob/53a79413c58678b1c50dde57e71de5c123132716/submodules/one-piece/packages/engine/src/automation/strategy-registry.ts), [PRs antiguos](https://github.com/TheCardGoat/tcg-engines/pulls?q=is%3Apr&page=9), [tcg.online/llm](https://tcg.online/llm), [llm.txt](https://tcg.online/one-piece/llm.txt) (generado el 26 sep 2026, 2.392 cartas), MCP de solo lectura en `https://api.tcg.online/mcp`.

---

## 7. Errores y supuestos dudosos del plan original

### 7.1 Supuestos explícitos del plan

| # | Supuesto del plan | Veredicto | Corrección | Fuente |
|---|---|---|---|---|
| 1 | El motor cubre OP-01 a OP-17 y EB-01 a EB-04 | **Parcialmente cierto** [V] | Las definiciones existen (~2.392 fichas), pero: (a) **OP-01 a OP-04 son el bloque 1, fuera de Standard** salvo las excepciones; (b) **faltan los Leaders de ST-10, ST-13 y ST-21 en adelante, incluido ST30-001 Luffy & Ace** (3,2% del meta de OP-17), y casi todo ST-22 a ST-36; (c) que la carta esté definida no garantiza que funcione bien: #223 (tests que no pueden fallar), 56 cartas con errores de signo de optcgapi, CR 1.2.0 frente a 1.2.1; (d) no hay capa de legalidad; (e) EB-05 y OP-18 aún no han salido (30 oct y 20 nov), así que su "falta" no es un retraso respecto a la competencia, que solo tiene cartas reveladas | [repositorio](https://github.com/TheCardGoat/tcg-engines), [topics/013](https://en.onepiece-cardgame.com/topics/013.php), [boosters](https://en.onepiece-cardgame.com/products/boosters/) |
| 2 | La API de OPTCG cubre hasta OP-15 | **Falso o desfasado** [F] | `/api/allSets/` devuelve 22 colecciones **hasta OP-17**, comprobado de nuevo el 4 oct 2026. "OP-15" es el texto viejo de la portada. Además no tiene datos de bloque ni de legalidad, no tiene licencia ni términos, depende de un solo mantenedor, **le falta ST-29** [SC] y **es el origen de errores de signo del motor** [V] | [optcgapi.com](https://www.optcgapi.com/), [allSets](https://optcgapi.com/api/allSets/) |
| 3 | SimOP solo cubre OP-01 y no tiene licencia | **Licencia: correcto. Cobertura: incorrecto** [V] | Cubre **OP01–OP03** (121, 121 y 123 cartas); el README desfasado dice OP01. Ya incluye **MCTS, determinización, evaluación aprendida y un analizador con barra de evaluación** (17 sep 2026), así que es un competidor conceptual directo, aunque solo juegue el bloque 1. Sin licencia: no reutilizar su código. | [SimOP](https://github.com/khoile3009/SimOP) |
| 4 | Regionals de Burdeos 14–15 nov, Utrecht y Rungis en diciembre | **Correcto** [V] | Burdeos: 14–15 nov (PECO, Pullman Bordeaux Lac). Utrecht: **5–6 dic** (Olli Baba, Beatrix Theater). Rungis: **12–13 dic** (PECO, Espace Jean Monnet; la web lo lista como "Paris"). Ojo: hubo otros Utrecht el 11 jul y el 5–6 sep. **Añadir Elx (Alicante), 28–29 nov**, el más cercano para un jugador en España y con OP-18 ya legal [F] | [Regionals T2](https://en.onepiece-cardgame.com/events/regional-season2-26-27.html) |
| 5 | El bot-lab necesita ≥200 bloques emparejados | **Dudoso como regla fija** [F] | Viene de la promoción del original (200 bloques = 400 partidas, con un efecto enorme). 400 partidas solo detectan ~+49 Elo (57%) con potencia 0,80; para +20 Elo hacen falta ~1.574 de media con SPRT. Usar SPRT sobre pares con un mínimo como suelo y definir qué es un "bloque" (2 o 4 partidas). | Sección 3; [Fishtest maths](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html) |
| 6 | OPlayTCG tiene estadísticas de meta | **Correcto, con matices** [V] | 36.261 partidas (3 oct 2026) con separación primero/segundo y empezar primero ganando el 47,9%. Pero son **partidas de su simulador, no de torneos**, no hay API y **su robots.txt bloquea ClaudeBot y similares**, así que solo vale la captura manual o el permiso del operador. Las cifras por líder no están verificadas. Además, OPlayTCG también es competidor (Solo vs AI). | [meta-stats](https://oplaytcg.com/en/meta-stats), [robots.txt](https://oplaytcg.com/robots.txt) |
| 7 | Limitless es la fuente de las listas | **Parcialmente cierto** [V] | Son dos productos: (a) la **API** de play.limitlesstcg.com, con listas completas y emparejamientos **de torneos online, sobre todo de simulador**, sin datos de quién empezó, sin `/decks` para proyectos privados y con un límite de ~50 peticiones cada 5 minutos; (b) **onepiece.limitlesstcg.com**, con los majors curados y sin API, que **aún no tiene ningún resultado de la temporada 2** (el primer major de OP-17 es Monterrey, el 24 oct). Para OP-17 hacen falta fuentes complementarias (onepiecedb.io, opdecks, onepiecetopdecks para Japón, los mazos recomendados de Bandai) y respetar los términos de gumgum.gg. | [docs](https://docs.limitlesstcg.com/developer.html), [torneos](https://onepiece.limitlesstcg.com/tournaments) |

### 7.2 Otros errores o supuestos dudosos detectados

1. **"Superar al `heuristic` de tcg-engines ya nos haría más fuertes que nada"** [R]. OPTCG AI (PPO+MCTS, [NV]), SeaKing (búsqueda con información justa y análisis de letal) y OPlayTCG (Solo vs AI) ya existen.
2. **"SeaKing es solo un rival, no un analizador"** [R]. Ya hace búsqueda de letal perdido y califica decisiones; lo diferencial nuestro es la información justa, el win% calibrado y las posiciones importadas.
3. **"Los bots del motor hacen trampa (oracle)"** [P]. Es la etiqueta de acceso; el código revisado solo lee recuentos públicos del rival. La desventaja de enfrentarnos a ellos "aunque tengan oracle" es probablemente pequeña.
4. **"La búsqueda y las redes no funcionan sobre este motor"** (según HeitorWestphal) [P]. Las medidas se hicieron con el motor roto, solo 40 simulaciones y ~400 comandos/s, y la red acabó empatando. Es evidencia débil.
5. **"El formato `standard` del motor equivale al Standard real"**: falso [V]. Acepta el bloque 1 y las prohibidas.
6. **"Las reglas del motor están al día"**: falso [V]. Sigue la 1.2.0 y la vigente es la 1.2.1.
7. **"La época de OP-17 empieza el 28 ago"** [P]. Hay eventos online de OP-17 desde el 13 ago (14 eventos y 682 inscripciones antes del 28). Además la época es corta: OP-18 sale el 20 nov.
8. **"Las excepciones de bloque son dos categorías y 53 cartas"** [P]. Son tres secciones (55 entradas, 53 números únicos); **EB04-061 solo aparece en la tercera**; la lista del bloque 4 está fechada el 23 jul 2025.
9. **"OP-16 es bloque 4"**: falso, es bloque 5 [V]. Además la base EN tiene **errores de icono en OP-05**, así que hay que contrastar con la japonesa.
10. **"ST-10 rotó con el bloque 1"**: falso, es bloque 2 [V].
11. **"Las regionales de noviembre no tienen OP-18"**: Elx (28–29 nov) **sí** lo tendrá por la regla de 7 días [F].
12. **"La Kaggle Pokémon reparte más de 300.000 $ en el track de simulación"** [P]. La categoría Simulation no tiene premio en metálico.
13. **"Rubin 2026 es el estado del arte en LOCM"** [P]. Está a la par o ligeramente por encima de ByteRL, no fue una entrada oficial y no tiene revisión por pares.
14. **"Bandai está cerrando simuladores online"** [NV]. Solo hay fuentes secundarias; tampoco se verificó que OPTCG AI se mostrara "preocupado" públicamente.
15. **Fuga de información en la búsqueda** [SC]. Si los mundos se copian del estado real, la búsqueda ve los robos futuros por la semilla. Las semillas dependen del asiento (rompe las partidas duplicadas) y `shuffleDecks` está a `false` por defecto.
16. **"Las correcciones públicas al motor son permanentes"** [NV]. El repositorio privado es el canónico y las exportaciones sobrescriben el público.
17. **"El Tournament Rules Manual es de enero de 2026"** [V, con matiz]. Figura con esa fecha en el índice, pero la cabecera del PDF dice 17 oct 2025.
18. **"Se pueden usar SimOP, Harsh-Patel73 o Jackten como base"**: no, porque no tienen licencia [V]. HeitorWestphal, opctcg-companion, MageZero y ditshej sí son MIT.

---

## 8. Lista consolidada de lo que NO está verificado

- **OPTCG AI:** todo (algoritmo, versiones, "~75%", "600+ usuarios diarios", cobertura). La web da 403 y X da 402.
- **Fuerza de cualquier IA de OPTCG** contra humanos o contra otras IA: nadie la publica.
- **OPlayTCG:** su algoritmo, las cifras por líder y la fecha de sus términos.
- **SeaKing:** su método de búsqueda exacto y las colecciones que cubre.
- **OPTCG Topdeck y optcg-simulator.com:** qué hacen realmente. Tampoco el "solo play" de BANDAI TCG+ D.
- **OneSimulator, OPTCG Apps, DuelVoyager y PulseTCG:** si tienen IA.
- **Cierres de simuladores por Bandai:** solo fuentes secundarias.
- **Kaggle Pokémon:** los detalles del 1.º (2,24M parámetros, PPO en 4 etapas), solo por fragmentos de buscador. **Tales of Tribute 2026:** clasificación sin confirmar por los organizadores. **Obscuro:** solo se leyó el resumen. **XMage** AIMCTS y AIMinimax: solo fuente de foro. **Sparky de Arena:** sin fuente primaria. **Gwent:** sin IA fuerte encontrada. **Riot LoR** "48%": blog de proveedor. **DeNA:** año de la charla.
- **Límites SPRT por defecto de Fishtest.**
- **Rendimiento real de nuestra ruta rápida del motor** (es la primera tarea de la fase 1).
- **Si el motor ya cumple las CR 1.2.1**; el PDF oficial de la 1.2.0.
- **Si sobrevivirán #228 y #229** a la próxima exportación; los force-push posteriores al 12 jun 2026.
- **Política de contenido de fans de Bandai** para el juego de cartas; la licencia de los datos de optcgapi.
- **Límites de fechas del grupo "OP16"** de Limitless y si `format: null` significa siempre Standard.
- **La API alojada de ditshej**, los archivos de Card Kaizoku, los términos de onepiecetopdecks, Egman y optcgdb.
- **El formato propio de OPTCGSim**; si la cardlist oficial muestra el texto con errata.
- **El ganador de las EU Finals T1**; los resultados de Londres (3–4 oct); cualquier cuota de OP-17 sobre todos los inscritos.
- **El lugar de la final mundial** (solo la fecha está confirmada).
- **Las asignaciones de evento paralelo** (Extra Grand Battle o Treasure Cup) en cada regional; los detalles de Store Championship, Store Tournament y Treasure Cups (sin contrastar).
- **Bloques de EB-05, OP-18 y P-163** (aún no están en la base oficial).

---

## Anexo: fuentes adicionales citadas por los investigadores

**Bandai, oficiales:**
- [Inicio EN](https://en.onepiece-cardgame.com/)
- [Guía de juego](https://en.onepiece-cardgame.com/play-guide/)
- [Cardlist por colección](https://en.onepiece-cardgame.com/cardlist/?series=569117)
- [OP16-001](https://en.onepiece-cardgame.com/cardlist/?freewords=OP16-001)
- [OP-17](https://en.onepiece-cardgame.com/products/op17.html)
- [OP-18](https://en.onepiece-cardgame.com/products/op18.html)
- [blockicon-card (noticias)](https://en.onepiece-cardgame.com/news/blockicon-card.html)

**Limitless:**
- [play.limitlesstcg.com/api/games](https://play.limitlesstcg.com/api/games)
- [onepiece.limitlesstcg.com](https://onepiece.limitlesstcg.com/)
- Torneos [/450](https://onepiece.limitlesstcg.com/tournaments/450), [/451](https://onepiece.limitlesstcg.com/tournaments/451), [/459](https://onepiece.limitlesstcg.com/tournaments/459), [/460](https://onepiece.limitlesstcg.com/tournaments/460), [/461](https://onepiece.limitlesstcg.com/tournaments/461), [/462](https://onepiece.limitlesstcg.com/tournaments/462), [/463](https://onepiece.limitlesstcg.com/tournaments/463), [/464](https://onepiece.limitlesstcg.com/tournaments/464)
- Constructor: my.limitlesstcg.com/builder?game=OP

**Otros:**
- [optcgdb.com](https://www.optcgdb.com/)
- [Changelog de SeaKing](https://seaking.gg/patch-notes.html)
- [Comparativa de SeaKing](https://seaking.gg/best-optcg-simulator.html)
- [Kaggle Pokémon (competición)](https://www.kaggle.com/competitions/pokemon-tcg-ai-battle-challenge-strategy/)
- [Comentario #218 renderizado](https://r.jina.ai/https://github.com/TheCardGoat/tcg-engines/issues/218)
- [Issues #223](https://github.com/TheCardGoat/tcg-engines/issues/223), [#224](https://github.com/TheCardGoat/tcg-engines/issues/224), [#225](https://github.com/TheCardGoat/tcg-engines/issues/225)
- [App Teaching (iOS, URL alternativa)](https://apps.apple.com/us/app/one-piece-cardgame-teaching/id1631528594)
