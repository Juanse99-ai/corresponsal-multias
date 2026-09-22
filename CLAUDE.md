# Guía para Claude Code — App Corresponsal

## Entorno
- **Usa Node 22**, no el default (Node 16 rompe Next 16):
  `export PATH="$HOME/.nvm/versions/node/v22.21.0/bin:$PATH"`
- `npm run dev` (puerto 3000). Build: `npm run build`. Typecheck: `npx tsc --noEmit`.
  Pruebas: `npm test` (node:test, sin framework extra).
- El preview MCP usa el wrapper `.claude/dev.sh` (fija Node 22). Ese archivo y
  `.claude/settings.json` son locales de cada máquina y no van al repo.

## Supabase (compartido con el taller)
- Proyecto Supabase: `hpndvrjjizzkusuuhefb` (el mismo "App Gestion Taller").
- **Todas las tablas del corresponsal van con prefijo `corr_`** y RLS propio, para
  no tocar las tablas del taller (clientes, trabajos, etc.).
- Auth es compartido (mismo pool `auth.users`). Roles del corresponsal en
  `corr_profiles.rol` (`admin` | `operador`). Tener sesión NO basta: entra quien
  tiene perfil activo (`corr_es_miembro()`).
- Las tablas del taller están cerradas (RLS activo, sin permisos para `anon` ni
  `authenticated`). El corresponsal no las usa y no debe volver a abrirlas.

## Seguridad (no negociable)
- **RLS obligatorio en toda tabla nueva**, con sus políticas en la misma
  migración y su archivo de rollback (`*.down.sql`).
- **Nunca `using (true)` / `with check (true)` para `authenticated`**: siempre
  `public.corr_es_miembro()` o `public.corr_is_admin()`.
- **Cero credenciales, tokens o datos personales en archivos del repo**: ni en
  código, ni en comentarios, ni en documentación. Los ejemplos van inventados.
- Las migraciones aplicadas a mano en la base también se guardan en
  `supabase/migrations/`.

## Lógica del cuadre (lib/cuadre.ts)
- `SALDO FINAL = total_tirilla − (sr_luis + nequis + bancolombia + recaudos
  + prestamos_consignaciones)`. Solo cuadra lo ELECTRÓNICO (lo que pasó por
  Bancolombia). No metas `compensado`, `efectivo_consignaciones` ni
  `retiros_cash` en esta resta: esa versión era incorrecta.
- `compensado` NO resta del saldo final: solo del arqueo de caja físico
  (`efectivoEsperadoCaja`).
- `efectivo_consignaciones` y `retiros_cash` son columnas MUERTAS: existen en
  `corr_cuadres`, se guardan siempre en 0 y no tienen campo ni efecto.
- `sr_luis` es autoritativo del servidor (suma de `corr_consignaciones_luis` del día);
  nunca confíes en el valor del cliente al guardar.
- Arrastre: `saldo_luis_cierre = −saldo_final`; el `compensado` de un día se sugiere
  como el `saldo_luis_cierre` del cuadre anterior.

## Arquitectura
- Server Components + Server Actions. Lecturas en `lib/queries.ts`, acciones en
  `app/(app)/*/actions.ts`. Clientes Supabase en `lib/supabase/{client,server,middleware}.ts`.
- Auth/roles en `lib/auth.ts`; protección de rutas en `proxy.ts` (antes middleware).
- UI: primitivos en `components/ui`, módulos por carpeta. Montos enteros (COP) y
  `lib/format.ts` para formato. Números con clase `.tnum` (misma fuente con
  `tabular-nums` para alinear columnas).

## Convenciones de diseño
- Fuente única tipo iOS: SF Pro vía la pila del sistema de Apple (`--font-ios`,
  `-apple-system`). Sin Geist ni webfonts.
- Tema claro y oscuro (toggle `next-themes`, clase en `<html>`). Paleta dark por
  tokens en `.dark` (globals.css). Acento único azul (`--accent`). Los tokens
  `nav-*` (menú overlay + hero login) son iguales en ambos temas.
- Verde/rojo solo para estado (cuadrado/descuadre). Sin morados/neón, sin emojis.
  Sin glows decorativos en tarjetas. Iconos: `@phosphor-icons/react/dist/ssr`.
- GSAP solo aislado (login). Framer Motion para el resto. No mezclarlos en el mismo árbol.
