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
- Pestañas del computador como en Biela, **sin iframes**: todas las pantallas
  abiertas montadas en el mismo árbol (`components/shell/pestanas.tsx`), cada una
  pintada en el servidor por `cargarPantalla` (`app/(app)/pantallas.tsx`) con su
  misma `page.tsx`; reglas en `lib/pestanas.ts`. Por eso las pantallas usan
  `useNavegacion()` (`lib/use-navegacion.ts`) y **no** `useRouter()` para
  refrescar después de guardar o ir a otra pantalla. Una pantalla nueva se suma
  a `PAGINAS` y a `CARGAS`. Nada necesita meter la app en un iframe: no se
  vuelve a permitir en las cabeceras (`frame-ancestors`).
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
    `type="button"` por defecto y `cargando` (ruedita, mismo color); campos
    rellenos (gris con filete suave, blancos con aro azul al escribir) de 44 px
    con texto de 16 px (iOS no hace zoom); ventanas sin filetes, título de 15 y
    círculo de ícono solo si avisan de riesgo (`DialogHeader icono tono="warn|bad"`); `Card` sin relleno propio (cada pantalla pone `p-5 sm:p-6` o usa
    `CardHeader`/`CardContent`); variantes extra `success`/`info`/`danger` en
    `Badge` y `success`/`muted` en `Alert`.
  - Composiciones de la app hechas con shadcn: `ConfirmDialog` (AlertDialog),
    `ErrorNotice` (Alert), `MoneyInput` (Input), `ChoiceChip` (Toggle),
    `ThemeToggle` (Switch), `AreaTendencia` (Chart), `DatePicker` (Popover +
    Calendar, fechas ISO, en español), `IconButton` (Button + Tooltip; `forma`
    gris dentro de tarjetas, blanco en la cabecera, suelto en barras),
    `TarjetaNavy` (Card), `Celdas`/`Celda`, `Contador`, `Baldosas` (ToggleGroup),
    `Plegable`/`Cajon` (Collapsible), `Deslizar`, `Senal`, `FlechaFila` y
    `CifraCabecera` (en `PageHeader`).
  - Cuál usar: tablas → `Table`; filas de listas → `Item` dentro de
    `ItemGroup variant="cajitas"` (cajitas en el computador, renglones en el
    celular); iniciales → `Avatar`; barras de avance → `Progress`; "no hay nada"
    → `Empty` (seco: sin ícono ni punto final); fechas → `DatePicker`; filtros
    → `DatePicker`/`NativeSelect` con `variante="filtro"` (pastilla de 36);
    tarjeta o bloque de pantalla → `Cajon` (se recoge, recuerda lo recogido; con
    `historial` arranca recogido); aviso dentro de un texto → `Senal`; fin de
    fila → `FlechaFila`; cerrar el día → `Deslizar`; ícono de un tipo de plata
    → su tono de `lib/tonos.ts`;
    2 a 5 opciones cortas → `ToggleGroup variant="segmentado"`; 3 o 4 opciones
    con ícono que mueven plata (tipo, medio) → `Baldosas`; cifras que se
    comparan → `Celdas`; número junto a un título → `Contador`; la cifra sobre
    la que se aprieta el botón principal → `TarjetaNavy` (solo Cuadre, Panel y
    Control general); ventanas → `Dialog` (o `AlertDialog` si es confirmar algo
    destructivo); menú → `Sheet`; avisos efímeros → `toast` de sonner (el
    `<Toaster>` y el `TooltipProvider` ya están en `app/providers.tsx`); chat →
    `Message` + `Bubble`.
  - Cambiar de tema: `useCambiarTema()` de `lib/tema.ts` (fundido de 350 ms),
    nunca `setTheme` directo.
  - Fuera de shadcn solo quedan los efectos de pantalla completa de
    `components/fx`, los indicadores de los gestos (el círculo de jalar y el del
    borde) y las imágenes que se exportan como PNG (fondo blanco a propósito).
    Enter en un `Input`: `onKeyDown={(e) => esEnter(e) && fn()}` (`lib/utils.ts`).
- Módulos por carpeta. Montos enteros (COP) y
  `lib/format.ts` para formato. Números con clase `.tnum` (misma fuente con
  `tabular-nums` para alinear columnas).
- Lo que solo existe en el navegador (`document.body`, `localStorage`, la URL):
  `useMontado()` de `lib/use-montado.ts`. No uses `useEffect(() => setX(...), [])`
  para eso: el lint de React Hooks lo marca como error (`set-state-in-effect`).

## Reglas de Biela (9 nov 2026, mandan sobre lo de abajo si chocan)
El dueño pidió aplicar aquí las reglas actuales de la app del taller (Biela, repo
`taller-automotriz-app`) con las funciones del corresponsal. Detalle en DESIGN.md,
«Reglas de Biela». Lo que hay que cuidar en cada cambio:
- **Letra**: cinco tamaños (`text-meta` 12,5, `text-body` 13,5, `text-title` 15,
  `text-h1` 22, `text-display` 32) y dos pesos (400 y 500: `font-medium`, nunca
  `font-semibold`/`font-bold`). La jerarquía la da el gris.
- **Tiempos** con sus tokens (`--dur-fila` a `--dur-6`, `--dur-sale`); ningún ms a
  mano. **Cortes** 600/960/1200 (`sm`, `lg`, `xl`; en JS, `lib/cortes.ts`).
  **Capas** con `--z-*`; dentro de un componente, enteros de -1 a 9.
- **Botones** y opciones de menú de una o dos palabras; el detalle va en el
  título de lo que abren.
- **Cajones que se recogen**: todo bloque de pantalla es un `Cajon`; los
  historiales arrancan recogidos. Recogido queda el encabezado con su cifra.
- **Cabeceras y barras sin repetir**: arriba el título y los controles; sin
  pastillas de aviso ni cifras que ya están abajo. Cada dato se dice una vez.
- **Íconos con su color** (`lib/tonos.ts`): verde entra, rojo sale, azul banco y
  recaudo, ámbar préstamos, morado Sr. Luis. Las cifras siguen en tinta.
- **Sin punto medio** en pantalla; avisos dentro de un texto con `Senal`.
- **Fechas**: `formatDia` («19 oct») en listas y `formatCampo` (dd/mm/aaaa) en campos.
- `test/diseno-base.test.ts` y `test/diseno-pantallas.test.ts` revisan letra,
  pesos, tiempos, cortes, capas, botones, punto medio y fin de fila.

## Convenciones de diseño
- Fuente única tipo iOS: SF Pro vía la pila del sistema de Apple (`--font-ios`,
  `-apple-system`). Sin Geist ni webfonts.
- Estilo del taller (6 oct 2026, lo pidió el dueño: "mudar este diseño"), con el
  fondo Claro y la paleta Cobalto de Biela desde el 9 nov 2026. Dos temas con
  `next-themes` (clase en `<html>`): **Claro** (lienzo `#f6f7f9`, tarjetas
  blancas con filo fino, tinta neutra) y **Noche** (oscuro, negro total `#000`,
  tarjetas `#0e0e11`, sin sombras). Acento único cobalto. En el computador la app va en un marco redondo (`.marco`) sobre el
  lienzo, con riel de íconos por grupo y panel de secciones
  (`components/shell/riel-panel.tsx`). En el celular, arriba el logo con la lupa
  y los avisos, y abajo la barra flotante (`components/shell/barra-abajo.tsx`):
  Panel, Cuadre, Movimientos, Sr. Luis y Tú; Tú abre una hoja con el resto de
  pantallas, la cuenta, el tema y cerrar sesión. La barra se encoge al bajar,
  saca la lupa al arrastrar el dedo y baja cuando el teclado está arriba (no
  con un campo enfocado solo: el autoFocus de Movimientos no la esconde).
  Lo elegido en un riel (segmentado, pestaña) es pastilla blanca con sombra; en el
  menú, pastilla gris; en el riel de grupos, círculo en tinta oscura (`--riel-sel`). Detalle en
  DESIGN.md. Los tokens `nav-*` (banda de marca del login, bienvenida y
  celebración) son iguales en ambos temas; las tarjetas navy usan `--navy`.
- Verde/rojo para estado (cuadrado/descuadre), también en gráficos; la única
  excepción es el cuadro del ícono, que lleva el tono de su tipo de plata
  (`lib/tonos.ts`). Sin neón, sin emojis. Sin glows decorativos en tarjetas. Iconos:
  `@phosphor-icons/react/dist/ssr`.
- Que no parezca hecha con IA (se limpió a propósito, no reintroducir):
  - Nada de degradados "aurora" ni halos de luz. Única excepción: el velo azul
    arriba del lienzo de Noche, detrás del marco.
  - Celular: barra superior de lado a lado con `.barra-material` y línea fina
    abajo. Computador: la barra va dentro del marco, transparente, con la tira
    de pestañas y los avisos en cápsulas de vidrio. El vidrio con lente es solo
    para lo que flota (barra de abajo, menús, popovers, la × de cerrar);
    tarjetas, listas y ventanas son sólidas.
  - Etiquetas en oración normal, sin mayúsculas espaciadas (`uppercase tracking-*`).
    Las imágenes que se exportan (cuadre y reporte del Sr. Luis) sí conservan su
    formato de hoja de cálculo.
  - Sin punto medio (`·`) en pantalla (solo en el título de la pestaña del
    navegador y en las imágenes que se exportan); datos encadenados van con
    comas. Sin raya larga (`—`) como valor vacío.
  - Listas de cosas del mismo tipo en una sola tarjeta con separadores (como los
    ajustes de iOS), no una tarjeta por fila. En el computador, las filas de una
    `Table` dentro de una tarjeta se ven como cajitas separadas 6 px (CSS).
  - Textos concretos y en "tú": sin frases motivacionales, eslóganes ni datos de
    relleno; "del Sr. Luis" con artículo.
- Animación con CSS y Framer Motion, solo con motivo: retroalimentación o cambio
  de estado (montos que cambian, check al cerrar el día). Sin GSAP ni efectos por
  letra. Una sola curva, la de iOS (`--ease-ios`; en framer, `TRANSICION` y
  `CURVA_IOS` de `lib/movimiento.ts`), con los tokens `--dur-*` (120, 220 y 420
  ms para trabajar; lo que sale, en `--dur-sale`). Rebote solo en la lupa y la
  pastilla de la barra de abajo.
- Entradas escalonadas: la de cada pantalla por bloques (`app/(app)/template.tsx`
  + `.entra-bloques`, `--dur-paso` entre bloques) y las barras de "Últimos
  cierres" (`.barra-crece`, `--dur-paso` entre barras); no agregues otras. (Las filas de las
  tablas del historial y las burbujas del cruce ya entraban de a poco, 20 ms.)
- Todo se apaga con "reducir movimiento": `MotionConfig reducedMotion="user"`
  en el AppShell, el bloque `@media (prefers-reduced-motion)` de `globals.css`
  y, en JavaScript, `matchMedia` (cifras que cuentan, lupa, barra que se
  encoge, arrastrar hojas, fundido del tema).
- Gestos del celular, siempre atajos de algo que tiene botón (ninguno guarda,
  borra ni cobra por sí solo): atrás cierra la ventana u hoja de arriba
  (`lib/use-atras-cierra-ventanas.ts`, en el AppShell; cada ventana deja una
  entrada en el historial y Next 16 la acepta); las hojas se arrastran hacia
  abajo para cerrar (`lib/use-arrastrar-hoja.ts`, ya puesto en Dialog,
  AlertDialog y Sheet); jalar para actualizar
  (`components/shell/jalar-para-actualizar.tsx`, por eso `html` lleva
  `overscroll-behavior: none`); volver desde el borde solo en el iPhone con la
  app instalada (`components/shell/volver-desde-borde.tsx`).
- La entrada al abrir la app (`components/fx/entrada.tsx`, logo que da paso a
  la pantalla) va en CSS (`globals.css`) porque corre antes de que cargue el
  JavaScript. Sale una vez por sesión, y la bienvenida de 2 veces al
  día espera a que termine (`lib/entrada.ts`).
- Campos de fecha y hora nativos sin apariencia nativa (`globals.css`): con ella,
  iOS les suma relleno y un ancho mínimo, y se salen de su columna.
