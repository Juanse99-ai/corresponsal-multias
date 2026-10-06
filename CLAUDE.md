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
- `SALDO FINAL = total_tirilla − (sr_luis + nequis + bancolombia + recaudos
  + prestamos_consignaciones)`. Solo cuadra lo ELECTRÓNICO (lo que pasó por
  Bancolombia). Verificado contra los 15 días cerrados: da cero en los 13 que
  cerraron cuadrados. La versión anterior de esta línea (con compensado,
  efectivo_consignaciones y retiros_cash restando) era incorrecta: solo daba
  cero en 2 de 15.
- `compensado` NO resta del saldo final: solo del arqueo de caja físico
  (`efectivoEsperadoCaja`). Comprobado con el 2026-06-25, único día cerrado con
  compensado ($2.575.000): cerró en cero con la fórmula de arriba.
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
- UI: **shadcn/ui obligatorio** para todo componente de interfaz (botón, campo,
  tarjeta, diálogo, pestañas, casilla, selector, aviso, popover, gráfico...).
  Viven en `components/ui` (config en `components.json`, estilo new-york, íconos
  Phosphor). No armes `<button>`, `<input>`, `<select>` ni `<textarea>` a mano en
  las pantallas: usa el componente de shadcn, y si no existe, agrégalo.
  - Agregar uno: `npx shadcn@latest add <nombre>`. Si la red bloquea
    `ui.shadcn.com`, se copia de `github.com/shadcn-ui/ui`
    (`apps/v4/registry/new-york-v4/ui/<nombre>.tsx`).
  - Al agregar uno, cambia en su código: `bg-muted` → `bg-surface-2`,
    `text-muted-foreground` → `text-muted`, `bg-accent`/`text-accent-foreground`
    (hover suave) → `bg-surface-2`/`text-text`, `text-white` → `text-nav-text`,
    íconos de lucide → Phosphor. En esta app `muted` es texto gris y `accent` es
    el azul de marca para texto y aros; el relleno azul es `primary`
    (`--accent-fill`). El resto de tokens de shadcn (`background`, `input`,
    `ring`...) ya apuntan a la paleta en `globals.css`. Capas del estilo del
    taller: `bg-campo` (campos), `bg-blanco` (lo elegido, ventanas, menús),
    `bg-panel`, `bg-fila`/`border-fila-borde`, `bg-velo` (fondo de ventanas).
  - Ajustes propios ya hechos: botones en píldora con alto de 44 px y
    `type="button"` por defecto; campos rellenos (gris sin borde, blancos con aro
    azul al escribir) de 44 px con texto de 16 px (iOS no hace zoom); ventanas
    sin filetes con `DialogHeader icono tono`; `Card` sin relleno propio (cada pantalla pone `p-5 sm:p-6` o usa
    `CardHeader`/`CardContent`); variantes extra `success`/`info`/`danger` en
    `Badge` y `success`/`muted` en `Alert`.
  - Composiciones de la app hechas con shadcn: `ConfirmDialog` (AlertDialog),
    `ErrorNotice` (Alert), `MoneyInput` (Input), `ChoiceChip` (Toggle),
    `ThemeToggle` (Switch), `AreaTendencia` (Chart), `DatePicker` (Popover +
    Calendar, fechas ISO, en español), `IconButton` (Button + Tooltip).
  - Cuál usar: tablas → `Table`; filas de listas → `Item`; iniciales → `Avatar`;
    barras de avance → `Progress`; "no hay nada" → `Empty`; fechas →
    `DatePicker`; ventanas → `Dialog` (o `AlertDialog` si es confirmar algo
    destructivo); menú → `Sheet`; avisos efímeros → `toast` de sonner (el
    `<Toaster>` y el `TooltipProvider` ya están en `app/providers.tsx`); chat →
    `Message` + `Bubble`.
  - Fuera de shadcn solo quedan los efectos de pantalla completa de
    `components/fx` y las imágenes que se exportan como PNG (fondo blanco a
    propósito). Enter en un `Input`:
    `onKeyDown={(e) => esEnter(e) && fn()}` (`lib/utils.ts`).
- Módulos por carpeta. Montos enteros (COP) y
  `lib/format.ts` para formato. Números con clase `.tnum` (misma fuente con
  `tabular-nums` para alinear columnas).
- Lo que solo existe en el navegador (`document.body`, `localStorage`, la URL):
  `useMontado()` de `lib/use-montado.ts`. No uses `useEffect(() => setX(...), [])`
  para eso: el lint de React Hooks lo marca como error (`set-state-in-effect`).

## Convenciones de diseño
- Fuente única tipo iOS: SF Pro vía la pila del sistema de Apple (`--font-ios`,
  `-apple-system`). Sin Geist ni webfonts.
- Estilo del taller (6 oct 2026, lo pidió el dueño: "mudar este diseño"). Dos
  temas con `next-themes` (clase en `<html>`): **Azul** (claro) y **Noche**
  (oscuro, negro total `#000`, tarjetas `#0e0e11`, sin sombras). Acento único
  azul. En el computador la app va en un marco redondo (`.marco`) sobre el
  lienzo, con riel de íconos por grupo y panel de secciones
  (`components/shell/riel-panel.tsx`); el celular conserva su barra y su menú.
  Lo elegido (pestaña, ítem del menú) es pastilla blanca con sombra. Detalle en
  DESIGN.md. Los tokens `nav-*` (menú del celular + banda de marca del login)
  son iguales en ambos temas.
- Verde/rojo solo para estado (cuadrado/descuadre), también en gráficos. Sin
  morados/neón, sin emojis. Sin glows decorativos en tarjetas. Iconos:
  `@phosphor-icons/react/dist/ssr`.
- Que no parezca hecha con IA (se limpió a propósito, no reintroducir):
  - Nada de degradados "aurora" ni halos de luz. Única excepción: el lienzo del
    estilo del taller (`--lienzo`, degradado suave en Azul y un velo azul arriba
    en Noche), detrás del marco.
  - Celular: barra superior de lado a lado con `.barra-material` y línea fina
    abajo. Computador: la barra va dentro del marco, transparente. Nada de
    píldoras flotantes de vidrio.
  - Etiquetas en oración normal, sin mayúsculas espaciadas (`uppercase tracking-*`).
    Las imágenes que se exportan (cuadre y reporte del Sr. Luis) sí conservan su
    formato de hoja de cálculo.
  - Máximo un punto medio (`·`) por línea y nunca dentro de una etiqueta; datos
    encadenados van con comas. Sin raya larga (`—`) como valor vacío.
  - Listas de cosas del mismo tipo en una sola tarjeta con separadores (como los
    ajustes de iOS), no una tarjeta por fila. En el computador, las filas de una
    `Table` dentro de una tarjeta se ven como cajitas separadas 6 px (CSS).
  - Textos concretos y en "tú": sin frases motivacionales, eslóganes ni datos de
    relleno; "del Sr. Luis" con artículo.
- Animación con Framer Motion y solo con motivo: retroalimentación o cambio de
  estado (montos que cambian, check al cerrar el día). Sin GSAP ni efectos por
  letra. La única entrada escalonada es la de cada pantalla por bloques (estilo
  del taller): `app/(app)/template.tsx` + `.entra-bloques` en CSS, 45 ms entre
  bloques; no agregues otras.
- Única excepción: la entrada al abrir la app (`components/fx/entrada.tsx`, logo
  que da paso a la pantalla) va en CSS (`globals.css`) porque corre antes de que
  cargue el JavaScript. Sale una vez por sesión, y la bienvenida de 2 veces al
  día espera a que termine (`lib/entrada.ts`).
- Campos de fecha y hora nativos sin apariencia nativa (`globals.css`): con ella,
  iOS les suma relleno y un ancho mínimo, y se salen de su columna.
