# Web: juega contra el bot en el móvil o en el PC

Una página web estática (`packages/web`) para jugar partidas completas de One Piece Card Game
contra nuestro bot desde el iPhone o el PC, sin instalar nada. **No necesita servidor**: el motor
de reglas y el bot se ejecutan en el propio navegador, en un Web Worker, así que basta con un
alojamiento de ficheros estáticos.

- El tablero es el del simulador web de upstream (`TheCardGoat/tcg-engines`, MIT), vendorizado en
  `vendor/tcg-engines` sin cambios; en el móvil en vertical usamos un tablero propio más compacto.
- **El bot es honesto**: decide sobre copias determinizadas de la partida y no ve tu mano ni el
  orden de tu mazo. Además, la página solo recibe lo que ve tu asiento (tus cartas, las públicas y
  el registro visible para ti); la partida real vive dentro del Worker.
- **No hay asistente en directo**: durante la partida nadie te dice qué jugar. Al acabar puedes
  revisarla (en el navegador o con `pnpm opbot review`).

## 1. Cómo se juega

**Preparación.** Eliges:

- **Tu mazo**: los 9 mazos del meta (`decks/meta-op17-postban/`, con su Líder y su cuota), los mazos
  de prueba del motor, o **pegar una lista** en el formato de OPTCGSim (`1xOP17-079` para el Líder
  y `4xOP17-086` por carta). La lista se comprueba al momento y los errores salen línea a línea.
- **El mazo del bot**: igual, más "Al azar según la cuota del meta".
- **Quién empieza**: yo, el bot o al azar.
- **Nivel del bot**: Rápido, Normal o Fuerte (sección 3) y la velocidad de las animaciones.

**En la partida.**

- **Móvil**: abajo, "Jugadas (n)" lista todas tus jugadas y "Terminar turno" pasa el turno. Toca
  una carta para ver sus acciones. "Menú" (arriba a la izquierda) abre el registro, las opciones,
  "Rendirse" y "Salir".
- **PC**: las jugadas salen como botones a la derecha del tablero y al hacer clic en una carta.
  La barra lateral tiene el registro, las opciones, "Terminar turno" y "Rendirse".
- Las decisiones del motor (counters, bloqueadores, objetivos de efectos, mulligan...) aparecen en
  un panel abajo. "Ver tablero" lo pliega para mirar la mesa antes de contestar.

**Al terminar**: resultado y motivo, y los botones

- **Descargar partida**: un JSON en el mismo formato que `pnpm opbot play`. Se revisa con
  `pnpm opbot review --game <fichero> --seat south --worlds 32` (tú eres siempre `south`).
- **Revisar partida**: la misma revisión dentro del navegador, con 8 mundos (menos precisa que los
  32 de la terminal). En un PC tarda de 30 a 50 s para partidas de 40 a 70 decisiones con
  alternativas.
- **Revancha** (mismos mazos y nivel, reparto nuevo) y **Nueva partida**.

**Parámetros de la URL** (opcionales):

- `?seed=<texto>`: fija el reparto, quién empieza si es al azar y el azar del bot. Si juegas lo
  mismo, sale la misma partida (útil para repetir una situación o para informar de un fallo).
- `?anim=off|fast|normal|slow`: velocidad de las animaciones (también está en Opciones).

## 2. Ejecutar en local y compilar

Requisitos: los del repositorio (`pnpm run setup`).

```bash
pnpm web:dev       # servidor de desarrollo en http://127.0.0.1:5173
pnpm web:build     # compila la web estática en packages/web/dist/
pnpm web:preview   # sirve esa carpeta en http://127.0.0.1:4173
```

Para probar desde el móvil en la misma Wi-Fi: `pnpm --filter @opbot/web dev --host 0.0.0.0` y abre
`http://<IP del PC>:5173` en el móvil (expone el servidor de desarrollo a tu red local: ciérralo al
terminar).

**La carpeta `packages/web/dist/` es la web completa**: rutas relativas y sin enrutado en el
servidor, así que funciona copiada en cualquier carpeta o subruta de cualquier alojamiento estático
(no hace falta configurar redirecciones). Tamaño (5 ficheros, 4,9 MB; ~0,8 MB comprimidos):

| Fichero | Tamaño | gzip | Qué es |
|---|---|---|---|
| `assets/game.worker-*.js` | 3,6 MB | 0,47 MB | Motor, catálogo de cartas, bot, modelo de valor y mazos |
| `assets/index-*.js` | 0,84 MB | 0,25 MB | Interfaz (React, Mantine, tablero de upstream) |
| `assets/index-*.css` | 0,45 MB | 0,08 MB | Estilos |
| `index.html`, `icon.svg` | 1,3 KB | | |

Las **imágenes de las cartas no están en el repositorio ni en la compilación**: la página las pide a
`optcgapi.com` (la URL viene en los datos de cada carta), sin enviar la página de origen.

## 3. Niveles del bot

| Nivel | Agente | Qué es |
|---|---|---|
| Rápido | `policy-honest` | El bot del motor con nuestras correcciones (`agents/policy.ts`), decidiendo sobre un estado determinizado. Instantáneo |
| Normal | `search:sims=16,h=1,cands=8` | Búsqueda por simulación con la mitad de simulaciones y menos candidatas que Fuerte |
| Fuerte | `search:sims=32,h=1,cands=12` | El bot de búsqueda de la arena, con el modelo de valor por defecto (`models/value.json`, `mlp16-meta-v1`) |

Son exactamente los mismos agentes que en la terminal (el mismo código; un test compara los dos
puntos de entrada). Medido en la arena (`docs/RESULTADOS.md`, puntuación con su intervalo del
95 %): la búsqueda de Fuerte puntuó 71,3 % [67,0–75,6] contra el bot del motor (E11, con el modelo
de valor anterior) y el modelo actual puntúa 69,4 % [65,2–73,7] contra el anterior (E12). La
política de Rápido en su versión que lo ve todo (`policy`) puntuó 62,9 % [58,8–67,0] contra el bot
del motor (E9). **Rápido (la versión honesta) y Normal no se han medido en la arena**: no hay cifras
de su fuerza.

**Tiempo de pensamiento** (por decisión, en el navegador, Chromium sin pantalla en un Intel Xeon a
2,1 GHz; partida con semilla fija, 7 turnos, 33 decisiones del bot de las que cuentan las ~30 con
más de una opción; `pnpm web:perf`):

| Nivel | PC (media / mediana / p90 / máx.) | CPU 4 veces más lenta, aprox. móvil modesto (media / mediana / p90 / máx.) |
|---|---|---|
| Rápido | 2 / 1 / 4 / 15 ms | 7 / 1 / 6 / 81 ms |
| Normal | 157 / 130 / 298 / 487 ms | 631 / 506 / 1424 / 1650 ms |
| Fuerte | 265 / 218 / 498 / 653 ms | 1064 / 924 / 2214 / 2511 ms |

La interfaz no se congela mientras piensa (el bot está en el Worker; el hilo principal no tuvo
tareas de más de ~180 ms). Cómo se simuló la CPU lenta: la limitación de CPU de las DevTools de
Chrome **solo frena el hilo principal, no los Workers** (medido: la partida con "4x" en DevTools da
los mismos tiempos que sin limitar), así que la medición pausa los procesos del renderizador 3/4 del
tiempo (SIGSTOP/SIGCONT), que en una prueba de cálculo dentro del Worker lo hizo ~3,2 veces más
lento. Es una aproximación: falta medirlo en un iPhone real.

## 4. Publicarla en privado

Antes de nada: **no la hagas pública** (sección 6). Opciones:

| | Privacidad | Coste | Recomendación |
|---|---|---|---|
| GitHub Pages | La web es pública para cualquiera con la URL, aunque nadie la enlace. Desde un repositorio privado hace falta un plan de pago, y la web sigue siendo pública (el control de acceso solo existe en GitHub Enterprise Cloud) | Gratis solo desde repositorios públicos | No sirve para mantenerla privada |
| **Cloudflare Pages + Cloudflare Access** | Inicio de sesión por correo: solo entran las direcciones que apruebes (te llega un código) | Gratis (Access es gratis hasta 50 usuarios; puede pedir una tarjeta al darte de alta en Zero Trust aunque el plan sea gratuito) | **La recomendada** |
| Netlify | Publicar es gratis y muy sencillo, pero la protección con contraseña es de pago (plan Pro) | De pago para protegerla | Solo si ya pagas Netlify |

Condiciones de octubre de 2026: compruébalas en cada servicio antes de decidir.

### Cloudflare Pages + Access, paso a paso

1. Compila: `pnpm web:build`.
2. Crea una cuenta gratuita en https://dash.cloudflare.com.
3. Sube la web (elige una de las dos formas):
   - **Panel**: Workers & Pages → Create → Pages → "Upload assets" (Direct Upload). Pon un nombre de
     proyecto, por ejemplo `opbot-entreno`, y arrastra la carpeta `packages/web/dist`. La web queda
     en `https://opbot-entreno.pages.dev`.
   - **Terminal**:
     ```bash
     npx wrangler login
     npx wrangler pages project create opbot-entreno --production-branch main
     npx wrangler pages deploy packages/web/dist --project-name opbot-entreno
     ```
4. Protégela **antes de pasar el enlace a nadie**: en el panel, Zero Trust (la primera vez te pide
   un nombre de equipo y elegir el plan Free) → Access → Applications → Add an application →
   **Self-hosted**:
   - Application domain: `opbot-entreno.pages.dev`. Añade también `*.opbot-entreno.pages.dev`
     para que las versiones de vista previa queden protegidas.
   - Policy: Action **Allow**, Include → **Emails** → las direcciones de tus amigos (o "Emails
     ending in" para un dominio).
   - Login methods: **One-time PIN** (el código llega por correo; no hace falta ninguna cuenta).
   - Guarda.
5. Compruébalo en una ventana privada: debe pedir un correo y mandar un código. Para dar o quitar
   acceso, edita la lista de correos de la política.
6. Para actualizar: `pnpm web:build` y vuelve a subir la carpeta (o repite el `wrangler pages
   deploy`). La protección se mantiene.

En el iPhone: abre la URL en Safari → Compartir → "Añadir a pantalla de inicio" para tenerla como
una app (sigue necesitando conexión).

### Netlify (si aun así la prefieres)

`npx netlify-cli deploy --dir packages/web/dist --prod` (o arrastra la carpeta a
https://app.netlify.com/drop) y, con un plan de pago, Site configuration → Access & security →
Password protection. Sin esa protección, cualquiera con la URL puede entrar.

## 5. Limitaciones

- **Solo las cartas que soporta el motor.** Los 9 mazos del meta están auditados carta a carta
  (`docs/NOTAS_MOTOR.md`); los mazos de prueba y las listas pegadas pueden tener cartas con efectos
  incompletos o con fallos (la web lo avisa: "Lista no auditada"). Si una partida se bloquea o algo
  no cuadra, descarga la partida y repórtala con su semilla.
- **Textos mezclados**: lo nuestro está en español, pero el tablero de upstream y el registro del
  motor salen en inglés (fases, líneas del registro, algunos rótulos como "Close" o "EVENT LOG").
- **Imágenes**: vienen de `optcgapi.com` (con la marca "SAMPLE" de esa fuente). Sin conexión, o si
  ese servicio cambia, las cartas salen sin imagen.
- **Sin modo sin conexión** (no es una PWA con caché): hace falta conexión para abrirla.
- **Probada en Chromium** (pruebas automáticas con la pantalla de un iPhone 13, 390x844, y de PC),
  **no en Safari de un iPhone real**: pruébala en el teléfono antes de compartirla.
- **Tamaños**: el tablero de PC se usa desde 1240 px de ancho; las ventanas más estrechas y las
  tabletas usan el diseño del móvil. En horizontal en el móvil se juega peor que en vertical.
- La revisión en el navegador usa 8 mundos: para un análisis serio, descarga la partida y usa
  `pnpm opbot review` con 32 o más.
- No hay deshacer ni juego online entre personas.

## 6. Derechos de Bandai

One Piece Card Game, sus cartas e imágenes son de Bandai (y de sus licenciantes). Esto es una
herramienta personal de entrenamiento:

- **Mantenla privada** (amigos, detrás de un inicio de sesión), sin anuncios ni cobro.
- **No alojes imágenes de cartas** en el repositorio ni en la web publicada (hoy no se copian: se
  piden a `optcgapi.com`).
- No la publiques en tiendas de apps ni la uses durante partidas de torneo.

## 7. Cómo está hecha (para desarrollo)

- `packages/web`: React 19, Vite, Mantine y Tailwind. El tablero de PC
  (`OnePieceTabletopBoard`), su proyección del estado y su adaptador de animaciones vienen de
  upstream (`vendor/tcg-engines/.../apps/multi-game-simulator/src/games/one-piece/`) junto con
  `simulator-ui`, `simulator-contract` y `simulator-runtime`, **sin modificar**. Tres piezas de la
  app de upstream están adaptadas en `src/ui/` (con su atribución MIT) porque dependen de la
  plataforma alojada de upstream (cuentas, servidor, telemetría): `GameShell`, `GameSidebar` y
  `CardActions`. Los arreglos de maquetación del tablero se aplican desde fuera
  (`src/ui/board-fixes.css`). Detalles en `vendor/tcg-engines/UPSTREAM.md`.
- `src/worker/game.worker.ts` aloja la partida (`src/game/session.ts`: motor oficial con
  `applyCommand`, bot, `Knowledge`, registro de comandos) y habla con la página con los mensajes de
  `src/game/protocol.ts`. La página solo recibe la vista del asiento sur.
- `packages/opbot/src/web.ts` es el punto de entrada de `@opbot/core` para el navegador (sin `fs`
  ni APIs de Node): agentes por especificación con el modelo de valor incluido en el Worker.
- Pruebas:
  - `pnpm run check` incluye las unitarias de la web: protocolo del Worker, mazos y su lector,
    traducción de jugadas y **que la vista no cambia al redistribuir las cartas ocultas del bot**
    (no se filtra información).
  - `pnpm web:e2e` compila y lanza Playwright (Chromium sin pantalla, móvil 390x844 y PC
    1366x820): una partida completa Luffy (OP17-079) contra Rocks (OP17-039) en Rápido hasta el
    final, con registro descargado y revisión; tres turnos contra Fuerte con tiempos por decisión;
    tamaños de ventana; y una lista pegada con error. Capturas en `out/web-screenshots/`. Necesita
    el Chromium de Playwright: si no está instalado,
    `pnpm --filter @opbot/web exec playwright install chromium` (o `CHROMIUM_PATH=<ejecutable>`).
  - `pnpm web:perf`: la tabla de tiempos de la sección 3 (`out/web-think-times.json`).
  - En las pruebas las imágenes se sirven desde `out/card-image-cache/` o con una carta genérica
    (`e2e/card-images.ts`), así que no dependen de la red.
