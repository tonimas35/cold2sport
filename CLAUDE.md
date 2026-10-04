# CLAUDE.md

Bot de análisis para One Piece Card Game. Lee `PLAN.md` (objetivos, fases, estado) y
`docs/NOTAS_MOTOR.md` (cómo funciona el motor) antes de cambiar nada no trivial.

## Estructura

- `packages/opbot/` — nuestro código (TypeScript, se ejecuta con Bun).
- `vendor/tcg-engines/` — motor de reglas upstream (MIT), **vendorizado**. Ver `vendor/tcg-engines/UPSTREAM.md`.
- `decks/` — listas de mazos en texto (`4xOP01-016`). `examples/positions/` — posiciones JSON.

## Reglas

1. **No edites `vendor/` a la ligera.** Si hace falta cambiar el motor: haz el cambio, guárdalo como
   `vendor/patches/NNNN-nombre.patch`, documéntalo en `vendor/tcg-engines/UPSTREAM.md` y pasa
   `pnpm run engine:check`. Las reglas del juego y la terminología están en la skill del motor:
   `vendor/tcg-engines/submodules/one-piece/.agents/skills/op-rules/SKILL.md`.
2. **Accede al motor solo por la API pública `@tcg/op-engine`** o por
   `packages/opbot/src/engine/internals.ts` (único punto que importa ficheros internos).
3. **Simulación rápida** (`engine/sim.ts`): cualquier cambio debe mantener verde
   `test/sim-differential.test.ts`. Antes de dar por bueno un cambio de alcance, ejecútalo con más
   partidas: `SIM_DIFF_GAMES=300 bun test test/sim-differential.test.ts`.
4. **Agentes honestos**: un agente con `honest: true` no puede leer el estado real salvo a través de
   `determinize()`. Los bots del motor son "oráculo" (ven todo).
5. **Afirmaciones de fuerza** ("el bot X es mejor que Y") solo con la arena emparejada
   (`pnpm opbot arena ...`) y su intervalo o decisión SPRT; anota el comando y el resultado en
   `docs/RESULTADOS.md`.
6. Tras rechazar el motor un comando, **descarta el estado** (puede quedar corrupto).
7. Documentación para el usuario en español; comentarios de código en inglés, explicando el porqué.

## Validación

```bash
pnpm run setup          # instala todo (lo hace solo el hook de sesión en la nube)
pnpm run check          # typecheck + tests de packages/opbot
pnpm run engine:check   # suite del motor (solo si tocas vendor/)
```

Para cambios solo de documentación basta con `git diff --check`.
