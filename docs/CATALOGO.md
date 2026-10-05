# El catálogo del motor frente a la lista oficial (`catalog-check`)

Las auditorías carta a carta de los mazos del meta encontraron errores de importación en el catálogo
del motor que ningún test detecta: OP17-027 Benn.Beckman con counter 9000 (copió el poder), OP15-092
Luffy con atributo Strike, ST10-010 llamado "Trafalgar Law (TR)", tipos guardados como una sola
cadena, y texto en `.effect` sin bloque ejecutable. `pnpm opbot catalog-check` hace esa comprobación
**para todo el catálogo y de forma repetible**, para cada set nuevo (EB-05 sale el 30-oct-2026 y
OP-18 el 20-nov-2026).

Código: `packages/opbot/src/decks/official-catalog.ts` (lectura y comparación, sin red),
`official-fetch.ts` (descarga con caché) y `catalog-command.ts` (el comando). Tests:
`packages/opbot/test/official-catalog.test.ts` sobre un extracto de 10 cartas de la web
(`test/fixtures/official-cardlist.html`).

## Cómo se usa

```bash
pnpm opbot catalog-check                  # usa la caché; solo descarga series que no tenga
pnpm opbot catalog-check --refresh        # vuelve a descargar todo (61 páginas, 3-4 minutos)
pnpm opbot catalog-check --offline        # solo la caché, sin red
pnpm opbot catalog-check --series OP-17,EB-04         # solo esas series (código o id)
pnpm opbot catalog-check --fixes docs/catalogo-arreglos.json   # escribe los arreglos seguros
```

- **Fuente**: la lista oficial EN, `https://en.onepiece-cardgame.com/cardlist/?series=<id>`. Los ids
  de serie se leen del propio selector de la página (hoy 60: 36 barajas de inicio, OP-01 a OP-17,
  EB-01 a EB-03, PRB-01/02, promos y "Other Product Card"; EB-04 va dentro de OP-14 y OP-15). La
  lista de series se refresca una vez al día, así que un set nuevo se descarga solo en la siguiente
  ejecución.
- **Cortesía**: 2,5 s de pausa desde que termina una descarga hasta la siguiente petición, reintentos
  con espera creciente, y el HTML
  crudo se guarda en `out/official-cache/` (no se versiona). Una página sin cartas (mantenimiento,
  cambio de diseño) es un error y no se guarda en caché.
- **Salidas**: `out/catalog-check.md` (informe en Markdown) y `out/catalog-check.json` (lo mismo para
  herramientas, con la lista de arreglos). El informe ordena primero las cartas del pool del meta
  (`decks/meta-op17-postban/*.txt`, cambia con `--decks`), luego el resto de cartas legales en
  Standard (bloques 2-5 y no prohibidas, `legality.ts`) y al final las demás.

## Qué lee de cada carta

De cada impresión (`OP17-001`, `OP17-001_p1`, `EB04-061_p2`...) lee número, nombre, tipo de carta,
coste o vidas, poder, counter, colores, tipos (el campo "Type" partido por "/"), atributos, texto,
[Trigger], icono de bloque y producto. Las paralelas y reimpresiones se agrupan en su número; la
impresión base es la referencia. Reglas de lectura comprobadas con la imagen de la carta:

- la web pone "-" en el coste de los Eventos de coste 0 (OP15-074, OP17-076) y en el poder de los
  Personajes de poder 0 (EB01-013 Kouzuki Hiyori): se leen como 0;
- el texto trae `<Slash>`, `<Special>`... sin escapar: no se borran como si fueran etiquetas HTML;
- varias habilidades llegan pegadas sin salto de línea (`...Characters.[On Your Opponent's Attack]`):
  se separan por la etiqueta.

## Qué compara

| Categoría | Qué detecta | Cómo |
|---|---|---|
| `name`, `card-type`, `cost`, `life`, `power`, `counter`, `colors`, `attribute` | valor impreso distinto | comparación exacta (colores y atributos como conjuntos) |
| `types-joined` | varios tipos guardados como una cadena (`"Kid Pirates Supernovas"` por {Supernovas}/{Kid Pirates}) | los rasgos del motor son los tipos oficiales unidos con espacios, en cualquier orden |
| `types` | cualquier otra diferencia de tipos (mayúsculas, "NULL", tipos que faltan o sobran) | conjuntos |
| `trigger` | [Trigger] en un lado y no en el otro | el motor tiene [Trigger] si tiene el campo `trigger` o un bloque `trigger` (así lo decide `battle.ts`) |
| `alias` | "also treat this card's name as [X]" sin `alternateNames` | |
| `structure:<disparador>` | texto impreso con [Counter], [Trigger], [On Play], [When Attacking], [On K.O.], [Activate: Main], [On Your Opponent's Attack], [End of Your Turn], [On Block] o [Main] sin bloque de ese disparador | etiqueta al principio de una habilidad (no menciones como "activate this card's [Main] effect") |
| `structure:keyword` | [Blocker], [Rush]... impresos que no están en `keywords` | |
| `structure:static` | habilidad sin etiqueta de momento ("This Character gains", "All of your", "this card in your hand has a +2000 Counter", reglas de mazo) y la carta sin `permanentEffects`, `replacementEffects` ni `deckBuildingRules` | |
| `structure:replacement` | "If ... would ..., ... instead" sin `replacementEffects` | |
| `structure:auto` | habilidad "When ..." / "This effect can be activated when ..." sin ningún bloque que no sea de las etiquetas impresas | |
| `structure:sign` | número impreso negativo (−3000 power, −3 cost) que el texto del motor perdió **y** que el bloque guarda en positivo | la carta hace lo contrario de lo que dice |
| `effect-text` | texto de `.effect` materialmente distinto (erratas, otra carta, signos) | cambian números, etiquetas, palabras con efecto (turn/battle, Character, up to, less/more...) o la redacción es < 85 % parecida; se ignoran puntuación, `"Tipo"` frente a `{Tipo}`, texto recordatorio y notas del importador |
| `effect-text-missing` | la carta tiene efecto y `.effect` está vacío (informativo: los bloques pueden estar bien) | |

Además lista los números oficiales que faltan en el motor y las impresiones que la propia web
muestra distintas entre sí (por ejemplo EB01-023_p1 con poder 8000 frente a 6000 de las demás).

**Errores de la propia web.** La web no siempre coincide con la carta impresa. Los casos
comprobados con la imagen están en `SITE_CORRECTIONS` (`official-catalog.ts`) y se corrigen antes
de comparar; si la web los arregla, la corrección deja de aplicarse sola. Hoy son cuatro: OP06-004,
OP06-032 y OP06-105 salen como Slash y son Ranged; EB04-014 sale como "Kozuki Sukiyaki" y la carta
dice "Kouzuki Sukiyaki". En los cuatro el motor tenía razón.

## Resultado (5-oct-2026)

60 series, 4844 impresiones, 2785 números de carta; 2394 cartas en el motor (sin DON!!), todas
presentes en la lista oficial. Comando: `pnpm opbot catalog-check --refresh --fixes docs/catalogo-arreglos.json`.

| Categoría | Total | Pool del meta | Legales en Standard (incl. meta) |
|---|--:|--:|--:|
| `name` | 38 | 3 | 24 |
| `cost` | 3 | 0 | 3 |
| `counter` | 11 | 1 | 10 |
| `attribute` | 4 | 1 | 4 |
| `types-joined` | 1074 | 50 | 888 |
| `types` | 39 | 0 | 14 |
| `trigger` | 13 | 1 | 10 |
| `alias` | 1 | 0 | 1 |
| `structure:counter` | 5 | 2 | 5 |
| `structure:trigger` | 32 | 2 | 29 |
| `structure:onPlay` | 7 | 2 | 7 |
| `structure:onKo` | 1 | 0 | 1 |
| `structure:main` | 2 | 0 | 2 |
| `structure:static` | 5 | 3 | 5 |
| `structure:replacement` | 3 | 2 | 3 |
| `structure:auto` | 1 | 1 | 1 |
| `structure:sign` | 3 | 0 | 3 |
| `effect-text` | 20 | 1 | 15 |
| `effect-text-missing` | 3 | 0 | 3 |

Sin discrepancias en `power`, `life`, `colors`, `card-type`, `structure:keyword` ni en el resto de
disparadores. Faltan en el motor 391 números oficiales, 238 de ellos legales en Standard (48 promos y
190 cartas de barajas de inicio, de ST10 a ST36).

Lo más importante fuera de los datos:

- **Tipos unidos en 1074 cartas** (45 % del catálogo, 50 del pool del meta). Los 110 filtros de tipo
  exactos del motor (`{Navy}` sin `match: "includes"`) no ven esas cartas, y los 953 con `includes`
  las ven por subcadena (`{Rocks Pirates}` también acepta "Former Rocks Pirates").
- **Cartas que hacen lo contrario**: OP17-042 Kaido da +3000 al Personaje rival en vez de −3000;
  OP13-017 Monkey.D.Dragon se da +2000 en vez de −2000 al sustituir; OP11-023 Arlong fija su coste
  en 3 en vez de restarle 3 (cuesta 7).
- **Cartas con el efecto de otra**: OP11-020 X Calibur (un [Main] en vez de su [Counter]) y OP13-084
  St. Shepherd Ju Peter (un [On Play] que no tiene).
- **Habilidades enteras sin bloque**: OP17-003, 005, 041, 043 y 074 no tienen su [On Play];
  EB04-048 Rob Lucci no tiene ningún efecto; 32 cartas con [Trigger] impreso no tienen bloque
  `trigger` (16 de ellas de OP-16); OP16-038 y OP16-100 tienen su [Counter]
  pero no su [Main], y OP16-076, OP17-036, OP17-056 y OP17-116 al revés; OP13-079 Imu no aplica su
  regla de mazo.

## Comprobación a mano y falsos positivos

Se comprobaron **52 cartas** contra la imagen oficial de la carta
(`https://en.onepiece-cardgame.com/images/cardlist/card/<id>.png`), repartidas por todas las
categorías, y el lado del motor leyendo su definición:

| Categoría | Comprobadas | Reales | Falsos positivos | Nota |
|---|--:|--:|--:|---|
| `counter` | 11 de 11 | 11 | 0 | |
| `attribute` | 7 de 7 | 4 | 3 | los 3 eran errores de la web (OP-06 Ranged); ya corregidos con `SITE_CORRECTIONS` |
| `cost` | 3 de 3 | 3 | 0 | OP14-019, OP15-009 y OP17-026 cuestan 1 |
| `name` | 8 de 39 | 7 | 1 | EB04-014 era error de la web; ya corregido |
| `types-joined` | 11 | 11 | 0 | la regla es exacta: solo marca si la unión reproduce los tipos oficiales |
| `types` | 6 | 6 | 0 | EB03-034 (Rocks Pirates), OP11-012, OP01-008, OP16-003, OP07-004, EB01-036 |
| `trigger` / `structure:trigger` | 4 | 4 | 0 | OP16-119, OP17-104, OP06-102, OP17-076 |
| `structure:*` (resto) | 12 | 12 | 0 | 8 por imagen (OP17-036, OP16-038, ST27-005, OP17-074, EB04-048, OP17-063, OP17-112, EB04-038) y 4 ya conocidos de la auditoría de Rocks (OP17-040, 045, 049, 056) |
| `effect-text` | 7 | 6 | 1 | OP01-080 ("Draw a card" = "Draw 1 card"); la normalización ya lo acepta |
| `structure:sign` | 3 de 3 | 3 | 0 | OP17-042 por imagen; OP13-017 y OP11-023 leyendo el bloque |

Tasa de falsos positivos **tras los ajustes**: 0 en la muestra en todas las categorías (con 3 a 12
cartas por categoría, la cota real puede ser de hasta un 10-20 % en las categorías pequeñas). La
primera pasada tenía muchos más, y cada patrón se corrigió en la herramienta:

- 140 `power` eran Personajes de poder 0, que la web escribe "-";
- 581 `types` eran tipos unidos en otro orden (ahora `types-joined`, sin importar el orden);
- 18 de 23 `structure:static` eran habilidades disparadas sin etiqueta ("This effect can be
  activated when ...", "If a Character is rested by your effect, ...") o frases "Then, ..." de la
  habilidad anterior partidas en otra línea;
- 67 de 87 `effect-text` eran notas del importador ("This card has been officially errata'd.",
  "Disclaimer: ..."), "NULL" en cartas sin efecto, el [Trigger] metido dentro de `.effect` (ahora
  se compara aparte), el signo perdido en los costes DON!! (−2 escrito "2", sin efecto en el juego),
  "③" frente a "(3)", "(Special)" frente a `<Special>` y "Draw a card" frente a "Draw 1 card".

Riesgo que queda: **la web se equivoca a veces** (4 de 52 cartas comprobadas, 3 de ellas en
atributos), así que un arreglo de atributo o nombre de una carta importante merece mirar la imagen
antes de aplicarlo.

## Errores reales en cartas del pool del meta

17 cartas del pool tienen errores además de los tipos unidos (que afectan a 50). Todas comprobadas
(imagen o auditoría anterior):

| Carta | Mazos | Error |
|---|---|---|
| OP15-092 Monkey.D.Luffy | Sabo | atributo Strike; la carta es Special |
| OP16-119 Marshall.D.Teach | Robin | [Trigger] sin bloque: al revelarse no hace nada |
| OP17-021 Crone Oli | Shanks | nombre "Crone Oil" |
| OP17-027 Benn.Beckman | Shanks | counter 9000; no tiene counter |
| OP17-036 Withdraw Now and Allow Me to Save Face | Shanks | falta la mitad [Counter] (+4000 a [Shanks]) |
| OP17-037 Are You That Afraid of the New Era?!! | Shanks | nombre sin la última "!" |
| OP17-040 Edward.Newgate | Rocks | falta el +3000 al Líder cuando ataca o es atacado |
| OP17-045 Kyo | Rocks | falta la sustitución contra eliminación |
| OP17-049 Charlotte Linlin | Rocks | falta el [On Play] |
| OP17-056 Rocks Pirates | Rocks | falta la mitad [Counter] |
| OP17-063 Kaido | Kaido | falta "las cartas sin counter de tu mano tienen +1000 Counter" |
| OP17-074 Yamato | Pudding, Robin, Kaido | falta el [On Play] (añadir 1 DON!! descansado); la carta no tiene ningún bloque |
| OP17-095 Roronoa Zoro | Sabo, Luffy | falta la sustitución contra eliminación |
| OP17-104 Charlotte Cracker | Pudding | sin [Trigger] (ni campo ni bloque; el texto dice "Trigger Play this card." sin corchetes) |
| OP17-112 Charlotte Linlin | Pudding, Robin | falta el [Your Turn] que pone a 8000 el poder base de los Personajes con [Trigger] |
| OP17-118 Rocks.D.Xebec | Rocks | falta el Counter +2000 en mano |
| ST10-010 Trafalgar Law | Enel | nombre "Trafalgar Law (TR)": las 7 cartas que buscan [Trafalgar Law] no la ven |

Respecto a la auditoría anterior (Rocks y Luffy), son nuevos los de Sabo, Robin, Shanks, Kaido,
Pudding y Enel. La herramienta **no** encuentra bloques que existen pero hacen otra cosa: de esa
auditoría se le escapan OP15-088 (el +6 de coste aplicado en la mano), OP17-050 y OP17-055 (mirar 2
y reordenar) y los filtros `[Nombre]` que no incluyen al Líder. Eso sigue necesitando auditoría a
mano o tests por carta.

## Arreglos de datos: `docs/catalogo-arreglos.json`

Lista para aplicar mecánicamente en un parche del motor (este cambio no toca `vendor/`): 1178
arreglos, uno por línea, con `id`, `file` (fichero de la carta), `field`, `old`, `new` (`null` =
borrar la propiedad), `evidence` (valor y página oficial) y avisos:

| Campo | Arreglos | Comentario |
|---|--:|---|
| `traits` | 1074 | la partición exacta de la web; ningún filtro del motor depende de la cadena unida |
| `name` + `i18n.en.name` | 38 + 38 | ninguna carta del motor busca el nombre antiguo; 17 renombres arreglan búsquedas que hoy fallan (p. ej. ST10-010 para 7 cartas, Mr.2/Mr.3 para OP14-091, OP09-056, OP16-040) |
| `counter` | 11 | todos comprobados con imagen |
| `attribute` | 4 | todos comprobados con imagen |
| `trigger` | 13 | **llevan `needsBlock: "trigger"`**: el campo solo es seguro junto con el bloque `trigger`; sin él la carta revelada de Vida pide activar un [Trigger] que no hace nada y se pierde si se activa |

Los arreglos de coste (3) y de otros tipos (39) salen en `out/catalog-check.json` con `safe: false`:
los 9 de la muestra eran reales, pero conviene revisarlos uno a uno.

## Para un set nuevo (EB-05, OP-18)

1. Sincroniza el motor cuando upstream añada el set (`scripts/sync-engine.sh`).
2. `pnpm opbot catalog-check`: descarga solo las series nuevas.
3. Revisa primero la sección del pool del meta y luego la de Standard. Si una discrepancia de
   atributo o nombre parece rara, mira la imagen; si la web se equivoca, añádela a
   `SITE_CORRECTIONS` con la fecha.
4. Los arreglos seguros van en un parche de `vendor/patches/` con `pnpm run engine:check`.
