# Guía para Claude Code — App Corresponsal

## Entorno
- **Usa Node 22**, no el default (Node 16 rompe Next 16):
  `export PATH="$HOME/.nvm/versions/node/v22.21.0/bin:$PATH"`
- `npm run dev` (puerto 3000). Build: `npm run build`. Typecheck: `npx tsc --noEmit`.
- El preview MCP debe usar el wrapper `.claude/dev.sh` (fija Node 22).

## Supabase (compartido con el taller)
- Proyecto Supabase: `hpndvrjjizzkusuuhefb` (el mismo "App Gestion Taller").
- **Todas las tablas del corresponsal van con prefijo `corr_`** y RLS propio, para
  no tocar las tablas del taller (clientes, trabajos, etc.).
- Auth es compartido (mismo pool `auth.users`). Roles del corresponsal en
  `corr_profiles.rol` (`admin` | `operador`).
- No habilites RLS en tablas del taller: las tienen desactivadas a propósito y
  romperlas afecta la otra app.

## Lógica del cuadre (lib/cuadre.ts)
- `SALDO FINAL = total_tirilla − sr_luis − efectivo_consignaciones − retiros_cash
  − compensado − nequis − prestamos_consignaciones + ret_real`.
- `sr_luis` es autoritativo del servidor (suma de `corr_consignaciones_luis` del día);
  nunca confíes en el valor del cliente al guardar.
- Arrastre: `saldo_luis_cierre = −saldo_final`; el `compensado` de un día se sugiere
  como el `saldo_luis_cierre` del cuadre anterior.

## Arquitectura
- Server Components + Server Actions. Lecturas en `lib/queries.ts`, acciones en
  `app/(app)/*/actions.ts`. Clientes Supabase en `lib/supabase/{client,server,middleware}.ts`.
- Auth/roles en `lib/auth.ts`; protección de rutas en `proxy.ts` (antes middleware).
- UI: primitivos en `components/ui`, módulos por carpeta. Montos enteros (COP) y
  `lib/format.ts` para formato. Números con clase `.tnum` (Geist Mono).

## Convenciones de diseño
- Tema oscuro, acento único dorado (`--accent`). Verde/rojo solo para estado
  (cuadrado/descuadre). Sin morados/neón, sin emojis. Iconos: `@phosphor-icons/react/dist/ssr`.
- GSAP solo aislado (login). Framer Motion para el resto. No mezclarlos en el mismo árbol.
