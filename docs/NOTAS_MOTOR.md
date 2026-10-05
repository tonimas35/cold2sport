# Notas del motor (Fase 1)

Motor: [TheCardGoat/tcg-engines](https://github.com/TheCardGoat/tcg-engines), módulo One Piece,
vendorizado en `vendor/tcg-engines` (commit y parches en `vendor/tcg-engines/UPSTREAM.md`).
Rutas relativas a `vendor/tcg-engines/submodules/one-piece/packages/engine/src` salvo que se diga otra cosa.

Estas notas resumen lo que el bot necesita saber del motor. Todo lo marcado como *medido* se ha
comprobado ejecutando código (los tests de `packages/opbot/test` cubren lo más importante).

---

## 1. API mínima que usa el bot

| Qué | Dónde | Notas |
|---|---|---|
| `createMatch(config)` | `engine/match.ts` | Devuelve un estado **sin congelar** en fase `setup`. Las vidas aún no están puestas. |
| `applyCommand(state, cmd)` | `core.ts` | Inmutable (immer `produceWithPatches`). Devuelve estados **congelados**. Valida el estado entero tras cada comando. |
| `getLegalCommands(state, seat)` | `engine/legal.ts` | Devuelve **descriptores**, no comandos (ver §3). Por defecto mira `activeSeat`: para los prompts del defensor hay que pasar su asiento. |
| `projectStateForSeat(state, seat)` | `projection.ts` | Vista de un jugador. Útil para interfaces; el bot no la necesita (ver §4). |
| `heuristicAgent`, `aggressiveAgent` | `automation/heuristic-strategy.ts` | Bots de referencia. Ver §6. |

Nuestro código solo toca el motor a través de `packages/opbot/src/engine/internals.ts` (funciones
internas para la simulación rápida) y de la API pública.

### Configuración de partida (`MatchConfig`)

- Mazos como listas de ids de carta (`"OP12-016"`, una entrada por copia) y el Líder aparte.
- **Ojo: `shuffleDecks` vale `false` por defecto.** Sin ponerlo a `true` los mazos salen en el
  orden de la lista. Nuestro runner siempre lo activa.
- El barajado inicial usa la semilla `` `${seed}:${asiento}` ``: el orden de un mazo depende del
  asiento. Para comparar dos bots con las mismas cartas, se dejan los mazos fijos en su asiento y se
  intercambian los bots (es lo que hace nuestra arena).
- El motor **no valida** el tamaño del mazo al crear la partida (sí lo hace
  `validateDeckForFormat` en `cards/src/deck-validation.ts`, que no conoce bloques ni la ban list).

### Setup

1. Piedra, papel o tijera (`chooseJoKenPo`, los dos asientos; los empates repiten ronda).
2. El ganador elige quién empieza (`chooseFirstPlayer`). **Esto sobrescribe `config.firstPlayer`.**
3. Cada jugador hace `mulligan` (como mucho uno) o `keepHand`.
4. `startGame` por quien empieza: pone 5 vidas y arranca el turno 1 (sin robar y con 1 DON!!).

Los bots del motor juegan piedra-papel-tijera de forma fija y **norte gana siempre**; en `bot-lab`
eso hace que "alternar quién empieza" no haga nada. Nuestra arena guioniza el setup: sur gana el
piedra-papel-tijera y elige al primer jugador que pide el experimento.

### Fin de partida

Por daño al Líder, mazo vacío, efecto, concesión o juez. **El motor no tiene límite de turnos ni
detección de bucles**: el límite lo pone el runner (`maxCommands`, 1.500 por defecto).

---

## 2. Quién decide en cada momento

```
si hay un prompt pendiente (no de juez) -> decide prompt.seat
si no, en fase main                     -> decide activeSeat
setup                                   -> lo guioniza la arena
```

- Bloqueo, counter y [Trigger] de vida son prompts **del defensor**, en el turno del rival (el 71 %
  de los prompts de una partida típica).
- Nunca se ha visto más de un prompt pendiente a la vez (más de 10.000 decisiones medidas), pero el
  código lo tolera.
- Implementación: `actingSeat()` en `packages/opbot/src/engine/actions.ts`.

---

## 3. Jugadas legales y prompts

`getLegalCommands` lista exactamente las acciones de fase main (24.800 candidatas probadas, 0
rechazadas), pero **no las expande** y de los prompts solo da las opciones en bruto. Nuestro
`enumerateActions` construye las acciones concretas:

| Decisión | Representación en el motor | Cómo la expandimos |
|---|---|---|
| Jugar carta | `playCard` + `slotChoices` | Una acción por carta distinta; la casilla no importa. Con el tablero lleno (`slotChoices: []`) el motor abre un prompt para reemplazar. |
| Dar DON!! | `attachDon` sin cantidad | Cantidades 1, 2 y "todas" por objetivo. Ojo: `whenDonGiven` salta una vez por comando, no por DON. |
| Atacar | `declareAttack` con varios objetivos | Una acción por (atacante, objetivo). |
| Efecto [Activate: Main] | `activateEffect` | Una acción; los costes vienen después como prompts. |
| Bloqueo | prompt `battleBlocker` (0 o 1 bloqueador) | No bloquear + cada bloqueador. |
| Counter | prompt `battleCounter`, cualquier subconjunto de la mano | Multiconjuntos por id de carta, descartando los que exceden el DON!! disponible para eventos. |
| Objetivos "hasta N", búsquedas, costes | prompts `selectCards` / `selectTargets` / `costPayment` | Multiconjuntos de tamaño [min, max] (máx. 40). Los tokens de DON!! se agrupan. |
| Ordenar cartas | prompt `orderCards` (hasta 5! = 120) | Hasta 4 órdenes (identidad, inverso, rotaciones). |
| Sí/no, elegir opción | `confirm` / `chooseOption` | Una acción por opción habilitada. |

Cada acción lleva una **clave semántica** (ids de instancia para cartas públicas, ids de carta para
cartas ocultas) para que el árbol de búsqueda signifique lo mismo en cada mundo muestreado.

Factor de ramificación medido (84 partidas heurística contra heurística): media 8,9 opciones por
decisión, mediana 4, p90 19, p99 64. Unas 90 decisiones por partida (45 en fase main, 38 prompts).

### Trampas importantes

- **Un `resolvePrompt` rechazado deja el estado corrupto**: el prompt queda marcado como resuelto y
  la partida bloqueada. Tras cualquier rechazo hay que descartar el estado devuelto.
- Los manejadores aceptan algunas jugadas que `getLegalCommands` oculta (por ejemplo `playCard` con
  un prompt pendiente). Generar jugadas siempre desde `getLegalCommands`.
- Ids inexistentes lanzan una excepción en vez de rechazarse.
- **Restricciones ocultas en las selecciones**: algunos efectos limitan la suma de los objetivos
  (por ejemplo OP17-119 Loki: "Personajes con un coste total de 4 o menos"). El límite está en
  `resolutionContext.action.target.totalConstraint`, no en el mínimo/máximo del prompt, así que el
  motor ofrece combinaciones que luego rechaza. Los bots del motor caen en ello (en las pruebas
  con mazos del meta, el 30 % de las partidas con Loki se cortaban). `enumerateActions` filtra esas
  combinaciones y `repairPromptCommand` corrige las respuestas de la heurística.

---

## 4. Información oculta, determinización y azar

### Qué ve cada jugador (`projection.ts`, `canSeeCard`)

Una carta es visible si es de conocimiento público (`publicKnowledge`), es un Líder o un Personaje,
o está en tu propia mano. **Todo lo demás está oculto, incluidas tus propias vidas** y el orden de
tu mazo.

- **El motor olvida las revelaciones**: una carta buscada y revelada al añadirse a la mano, un
  Personaje devuelto a la mano o un [Trigger] no usado vuelven a quedar ocultos. Un jugador humano sí
  los recordaría. `packages/opbot/src/engine/knowledge.ts` lo reconstruye con información pública:
  cartas que pasan de una zona visible a una oculta y cartas nombradas en líneas de log *públicas*
  que dicen "reveals". **No se pueden usar los eventos** para esto: `cardMoved` lleva el id de la
  carta con visibilidad "public" incluso en robos privados.
- Los bots del motor reciben el estado completo, con la mano rival y el orden de los mazos. Sus
  estrategias se declaran *oracle*, aunque en la práctica la heurística no usa esa información
  (comprobado: 0 cambios de decisión en 1.638 comprobaciones al re-barajar lo oculto).

### Azar

No hay generador de números aleatorios guardado en el estado. Cada barajado crea un PRNG a partir de
una cadena basada en `config.seed` (más turno, contador de eventos, etc.). Robar no usa azar: el
orden del mazo ya está en el estado. Por tanto:

- El motor es **determinista** dado `config` y la lista de comandos.
- Lo oculto de verdad es: el `cardId` de cada carta oculta y **`config.seed`** (con la semilla se
  pueden reconstruir los barajados futuros).

### Determinización (`packages/opbot/src/engine/determinize.ts`)

1. Clonar el estado.
2. Para cada dueño, barajar los `cardId` de sus cartas ocultas entre sus propias instancias ocultas.
   Las instancias, zonas y demás campos se quedan donde están.
3. Fijar las cartas que el jugador está viendo en sus prompts y las referenciadas por la cola de
   resolución.
4. Quitar los prompts ya resueltos (guardan, por ejemplo, la mano rival de un counter anterior).
5. Cambiar `config.seed`.

Supuesto: el multiconjunto de cartas ocultas sale del estado real, es decir, **el bot conoce las dos
listas de mazo**. Es razonable con listas del meta públicas; sin ese supuesto habría que muestrear la
lista del rival a partir de su Líder (Fase 4 del plan).

Validado: invariantes de visibilidad y continuidad legal de partidas desde mundos determinizados
(`test/determinize.test.ts`).

---

## 5. Rendimiento

Medido en este contenedor (4 núcleos, Bun 1.3.14), partidas heurística contra heurística con los
mazos de prueba del motor.

| Operación | Tiempo |
|---|---|
| `applyCommand` oficial, motor original | 5,4–7,5 ms |
| `applyCommand` oficial, con el parche 0001 | ~3,2 ms |
| **`applyInPlace` (simulación rápida, nuestra)** | **~0,35 ms** (9× más rápido) |
| `getLegalCommands` original / con parche | ~1,1–1,5 ms / ~0,11–0,17 ms |
| Clonar un estado (sin historiales) | ~0,08 ms |
| Determinizar | ~0,13 ms |
| Decisión de la heurística del motor | ~0,4 ms |
| Partida completa heurística contra heurística | ~19 partidas/s por núcleo (antes ~1) |
| Tamaño del estado al final de la partida | 200–300 KB con historiales, 55–65 KB sin ellos |

### Por qué era lento y qué hemos cambiado

1. **Escaneos cuadráticos de efectos permanentes** (`effects/permanent.ts`): para cada consulta de
   poder, coste o palabras clave se recorrían todas las cartas comprobando si estaban en juego y si
   sus efectos estaban negados, antes de mirar si la carta tenía siquiera el efecto buscado.
   Parche `vendor/patches/0001-*`: índice estático por carta de los tipos de acción de sus efectos
   permanentes, consultado primero. Mismos resultados; el suite completo del motor sigue en verde.
2. **Proxies de immer**: casi todo el tiempo restante eran trampas de proxy sobre el borrador.
   `packages/opbot/src/engine/sim.ts` ejecuta el mismo código de reglas
   (`applyQueuedCommandMutation` + `drainResolutionQueue`, como `core.ts`) directamente sobre un
   clon plano y mutable, sin parches, sin validación y sin animaciones.

Detalles de la simulación rápida que importan:

- Hay que emitir el evento `commandAccepted` igual que `core.ts`: los ids de prompts y las semillas
  de barajado dependen de los contadores de ids y eventos.
- `capabilityHistory` no se puede vaciar: `engine/legal.ts` la lee.
- **Alias de arrays**: el motor a veces guarda el mismo array en dos sitios (por ejemplo
  `candidateIds = player.hand`, o `battle.counterCardIds = command.selectedIds`). Con immer el alias
  se rompe en el siguiente comando; con objetos planos seguiría vivo. Lo resolvemos clonando cada
  comando y "des-aliasando" el estado tras cada comando.
- `config` se muta durante el setup (`firstPlayer`): se copia.

**Prueba diferencial** (`test/sim-differential.test.ts`): 300 partidas completas (~27.000 comandos)
reproducidas por las dos vías con estados y jugadas legales idénticos tras cada comando.

---

## 6. Bots existentes en el motor

- Todos deciden sin búsqueda: puntúan cada jugada una vez y eligen la mejor.
- `heuristic` es el bot "de producción" y `aggressive` su variante ofensiva. En el motor actual
  **`aggressive` gana a `heuristic` ~61 %**: hay que batir a los dos.
- Debilidades conocidas de la heurística (útiles como pruebas para nuestro bot):
  - los prompts "hasta N" de tipo `chooseOption` caen en la opción `"0"` (por ejemplo, el coste del
    Líder Oden se paga y no se activa nada);
  - carga todo el DON!! sobrante en un único atacante;
  - ataca con todo, todos los turnos, y casi nunca pasa;
  - con la política equilibrada no hace counter con 4 o más vidas.

### `bot-lab` (herramienta del repo original)

Útil como referencia, pero tiene limitaciones que nuestra arena corrige:

- Cada partida del bloque usa una semilla distinta, así que el "par" no juega las mismas cartas.
- Por el piedra-papel-tijera fijo, alternar quién empieza no tiene efecto.
- Pruebas secuenciales sin corrección por mirar varias veces; intervalo bootstrap.

Nuestra arena (`packages/opbot/src/arena/`): pares con la misma semilla, mazos fijos por asiento,
bots intercambiados, primer jugador controlado, modelo pentanomial y SPRT (como fishtest).

---

## 7. Cobertura de cartas y formato

- El motor trae OP-01 a OP-17, EB-01 a EB-04, PRB-01/02 y parte de los ST. **Faltan EB-05
  (30-oct-2026) y OP-18 (20-nov-2026)** y algunos ST recientes (por ejemplo el Líder ST30-001).
- Reglas: Comprehensive Rules 1.2.0 (enero 2026). La versión vigente es la **1.2.1 (28-ago-2026)**.
- El motor **no conoce la rotación por bloques ni la ban list**: lo cubre nuestro módulo de
  legalidad (`packages/opbot/src/decks/legality.ts`).
- Issue abierto upstream #223: unos 469 tests generados por carta no pueden fallar. Antes de fiarse
  de un mazo hay que comprobar su comportamiento (partidas de prueba, `capabilityHistory`).
- **Errores de datos detectados**: ST32-002 Kouzuki Oden dice "con coste base 6 o menos", pero su
  objetivo no tiene ese filtro. Upstream también corrigió en septiembre signos perdidos al importar de
  optcgapi (−4000 convertido en +4000).
- **Soporte del meta post-ban** (informe completo en `decks/meta-op17-postban/README.md`):
  - parche `0002`: ST34-002, ST34-003 y ST34-004. Con ellas Kaido, Robin y Pudding entran en el
    pool (8 mazos, 560 partidas de comprobación sin comandos rechazados);
  - falta el Líder ST30-001 (Luffy & Ace) y sus cartas de ST21/ST31;
  - los eventos con coste DON!! −X de Enel (OP15-074 a OP15-078; Mamaragan también va en Kaido y
    Pudding) generan registros "unsupportedCost" y el mazo apenas gana.

### Que el mazo "funcione" no basta: auditoría carta a carta

Que un mazo termine sus partidas sin errores **no** significa que sus cartas hagan lo que dicen. La
auditoría contra el texto oficial y las FAQ (reproduciendo cada fallo con comandos) encontró, solo
en Rocks (el 22 % del meta):

| Carta | Fallo | Efecto en las partidas |
|---|---|---|
| OP17-118 Rocks.D.Xebec | Falta su Counter +2000 desde la mano (texto estático en mano: el motor solo evalúa estáticos en juego) | 4 de los 16 counters del mazo no se pueden usar |
| OP17-056 Rocks Pirates | Falta la mitad [Counter] | Otros 4 counters perdidos; la heurística la tira como evento [Main] sin DON |
| OP17-040 Edward.Newgate | Falta el +3000 al Líder cuando ataca o es atacado (el motor no tiene disparador "cuando tu Líder ataca" para otras cartas) | Pierde su principal herramienta |
| OP17-049 Charlotte Linlin | Falta el [On Play] en que el rival elige | Sin ventaja de cartas |
| OP17-045 Kyo | Falta el efecto de sustitución contra eliminación | El tablero cae ante Luffy y Sabo |
| OP17-050, 055, 046, 118 | Mirar 2 y reordenar; [Rocks.D.Xebec] no apunta al Líder; tipos guardados como una sola cadena; {Rocks Pirates} como subcadena | Menores |

Y en Luffy OP17-079: OP15-088 Pirates Docking Six aplica su "+6 de coste" también en la mano, así
que cuesta 11 y **nunca se puede jugar**; a OP17-095 Roronoa Zoro le falta el efecto de sustitución.

Con esto se explica que la calibración saliera **negativa** (Rocks perdía 30 de 30 contra Luffy con
el bot de búsqueda, frente al 30 % real): el problema no era solo el bot, sino el motor. Las
correcciones van como parches `0003` y siguientes, cada una con tests dirigidos por comandos, la
suite completa del motor y el test diferencial del simulador.

Patrones de fallo que conviene buscar en cualquier carta nueva:

1. texto en `.effect` que no aparece en `effects` (mitades [Counter], [On Play], sustituciones);
2. efectos estáticos que deben funcionar desde la mano (counters condicionales);
3. modificadores de coste propios con `zones: ["hand", ...]` cuando el texto es de personaje;
4. tipos compuestos guardados como una sola cadena y filtros de tipo con `includes` donde el texto
   dice `{Tipo}` exacto;
5. `[Nombre]` que debería incluir al Líder.

Los patrones 1, 2 y 4, y los errores de datos (counter, atributo, nombre, coste, [Trigger]), los
busca ahora `pnpm opbot catalog-check` en todo el catálogo contra la lista oficial EN
(`docs/CATALOGO.md`). Los patrones 3 y 5, y en general un bloque que existe pero hace otra cosa,
siguen necesitando la auditoría a mano.
