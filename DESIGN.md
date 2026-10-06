# DESIGN.md — Corresponsal · Multidiagnósticos AS

Registro: **product** (app de operación interna). Escena que fija el tema: Ivana operando
todo el día desde un PC en un local iluminado, leyendo cifras de plata → **tema Azul**
(claro) por defecto; **Noche** para quien la prefiera.

## Estilo del taller (6 oct 2026)

El dueño pidió "mudar" a esta app el diseño nuevo de la app del taller
(Multidiagnósticos AS). Se tomó el sistema visual; la lógica, las rutas y los textos no
cambiaron:

- **Dos temas** (next-themes): **Azul** = claro, **Noche** = oscuro, negro de verdad
  (`#000`), marco `#08080a`, tarjetas `#0e0e11`, acento `#2563eb`, sin sombras (el borde
  fino separa). Se cambian con el sol/luna del riel (computador) o el interruptor de la
  hoja "Tú" (celular), con un fundido de 350 ms de toda la página (`lib/tema.ts`). La
  barra del sistema toma el color del tema elegido, no el del teléfono.
- **Marco** (computador, `.marco`): la app es una ventana de 30 px de esquina sobre un
  lienzo con degradado suave (`--lienzo`, `--marco`, `--marco-sombra`). La barra de arriba
  queda dentro, transparente.
- **Riel + panel** (`components/shell/riel-panel.tsx`): un ícono por grupo (Principal,
  Administración; el elegido es un círculo azul, punto rojo si el grupo escondido tiene
  algo urgente). Al lado, el panel del grupo (`--panel`): nombre, buscador de día o
  persona, secciones con el contador de préstamos en gris y quién entró. Al pie del riel:
  tema, iniciales (avisos y cerrar sesión) y esconder el panel.
- **Barra de abajo** (celular, `components/shell/barra-abajo.tsx`): cápsula de vidrio
  flotante con Panel, Cuadre, Movimientos, Sr. Luis y Tú; la pantalla abierta lleva una
  pastilla y los pendientes un globo rojo. Arrastrando el dedo sale la lupa (rebota y
  vibra al cambiar de botón). Se encoge al bajar la página, vuelve al subir y baja cuando
  el teclado está arriba. "Tú" abre una hoja con el resto de pantallas, Administración, la
  cuenta, el tema, los avisos y Cerrar sesión. Arriba, el logo (lleva al Panel), la lupa y
  los avisos.
- **Tarjetas** de 24 px, tenues (`--surface`), borde de luz (`--tarjeta-borde`) y sombra
  suave (`--tarjeta-sombra`). Listas de lo mismo en una sola tarjeta: en el computador
  cada fila es una cajita (`--fila`, `--fila-borde`) separada 6 px (`Table` dentro de
  `Card`, o `ItemGroup variant="cajitas"`); en el celular, renglones a sangre con una
  línea (`--linea-fila`).
- **Tarjeta navy** (`components/ui/navy.tsx`): la cifra sobre la que se aprieta el botón
  principal, una por pantalla y solo en Cuadre (saldo final), Panel (cuadre de hoy) y
  Control general (saldo total).
- **Cifras**: las que se comparan van en celdas partidas por filetes (`Celdas`); la del
  resumen de la pantalla, en la cabecera (`CifraCabecera`: total pendiente en Préstamos,
  saldo del Sr. Luis). Las de titular cuentan desde 0 al aparecer y ruedan al cambiar.
- **Cabecera de pantalla**: título de 26 en peso medio, subtítulo de 13,5 y 18 px de aire;
  en el computador, la miga de pan encima ("Principal › Cuadre diario", `--miga`).
- **Lo elegido** (pestaña, ítem del panel) es pastilla blanca (`--blanco`) con sombra.
- **Segmentados** (opción A): riel hundido y una pastilla que viaja a la elegida. Para 2 a
  5 opciones cortas. **Fichas** para filtros y personas; **baldosas** para 3 o 4 opciones
  con ícono que deciden dónde cae la plata (tipo de movimiento, medio de pago).
- **Campos rellenos**: gris `--campo` sin borde, 16 px de esquina; al escribir, blancos con
  el aro azul. Rótulo de 12,5 en gris, encima del campo. Los filtros son pastillas de 36.
- **Ventanas**: sin filetes, fondo `--blanco`, título de 22 px (17 en el celular), ícono en
  un círculo de 44 px junto al título (`DialogHeader icono tono`; las confirmaciones, rojo),
  Cancelar gris relleno; entran creciendo desde 0,95 y se van al cerrar. En el celular son
  hojas que suben desde abajo, con agarradera, y se arrastran hacia abajo para cerrarlas.
- **Chips y contadores**: estados en su par de fondo y letra (`--ok-*`, `--bad-*`,
  `--warn-*`, `--info-*`), con punto en las listas largas. El contador va junto al título
  ("Registrados 12"), gris salvo que el número sea un estado.
- **Vacíos secos**: una línea gris sin ícono ni punto final ("Sin movimientos"). El único
  que se celebra es "Sin hallazgos" de Auditoría.
- **Pantallas por bloques**: cabecera y cada tarjeta entran una tras otra, 45 ms entre
  bloques (`app/(app)/template.tsx`).
- **Versión nueva**: pastilla oscura flotante arriba al centro (`.version-nueva`).

No se tomó: la fuente Inter del taller (aquí sigue SF Pro), la barra de avance de la OT (el
corresponsal no tiene un proceso por pasos), el selector de tema con miniaturas (el
taller lo tiene en Configuración y esta app no tiene esa pantalla) y el medidor de
"% cuadrados" (el dueño no lo aprobó).

### Adaptaciones (lo del taller que no encajaba tal cual)

- **Navy**: lo de adentro de la tarjeta usa los colores de Noche volviendo a poner la clase
  `dark` dentro de ella (`dark sobre-navy`), en vez de tokens propios para cada pieza; así
  chips, segmentados y botones se ven bien sobre el azul oscuro en los dos temas.
- **Barra de abajo**: los botones son el `Button` de shadcn (obligatorio aquí) con sus
  estilos reseteados en `.gbar__b`; el taller usa botones propios.
- **Barras de la gráfica**: crecen con CSS (`.barra-crece`) en un `shape` propio de
  recharts, con su animación apagada. "Últimos cierres" solo muestra días con cierre, así
  que no hay "período vacío rayado".
- **Salida animada de las ventanas**: Radix ya anima `data-state="closed"`, y ninguna
  ventana de esta app se desmonta de golpe, así que no hace falta la copia muda del taller.
- **Arrastrar hojas**: con eventos táctiles y `touchmove` cancelable; con eventos de
  puntero el navegador se queda el gesto en cuanto empieza a desplazar la página.
- **Atrás**: cada ventana deja su entrada en el historial; Next 16 parcha `pushState` y
  copia su estado interno en ella, y al volver restaura la misma pantalla con los datos de
  ahora (revisado en `node_modules/next/dist/client/components/app-router.js`).
- **Barra que baja al escribir**: el taller mira solo el foco; aquí además el teclado
  (`visualViewport`), porque el monto de Movimientos tiene `autoFocus` y en el iPhone eso
  no saca el teclado.
- **Zona de soltar de Soportes**: relleno gris con el ícono en un círculo blanco, sin
  borde punteado en reposo (el taller no tiene esta pieza).
- **Hora de la bitácora**: "04:50 p. m." no cabe en la columna de 52 px de la línea de
  tiempo; va en dos renglones en vez de ensanchar la columna.

## Paleta (del logo: azul + rojo + blanco)

Tokens en `app/globals.css`, con valores para Azul (`:root`) y Noche (`.dark`).

| Rol | Token | Uso |
|---|---|---|
| Lienzo | `--lienzo` / `--bg` | fondo de página |
| Marco | `--marco`, `--panel` | ventana del computador y panel del menú |
| Superficie | `--surface` (tenue) | tarjetas |
| Blanco | `--blanco` | lo elegido, ventanas, menús |
| Campos | `--campo` / `--campo-hover` | campos rellenos |
| Filas | `--fila` / `--fila-borde` / `--linea-fila` | cajitas y renglones de las listas |
| Borde | `--line` / `--line-strong` | bordes sólidos suaves |
| Texto | `--text`, `--text-2`, `--muted`, `--faint` | cuerpo, rótulos, ayudas |
| Acento | `--accent` (texto) / `--accent-fill` (relleno) | botones, links, activo |
| Estados | `--ok-*`, `--bad-*`, `--warn-*`, `--info-*` | pares de fondo y letra |
| Éxito | `--success` verde | cuadrado / a favor (rellenos y gráficas) |
| Peligro | `--danger` **rojo del logo** | descuadre / negativos |
| Navy | `--navy` | la tarjeta de la cifra que se guarda |
| Marca | `--nav-*` **azul marino** | banda del login, bienvenida y celebración |

Estrategia de color: **restrained-committed** — neutros + azul como acento, rojo solo
para estado negativo, verde solo para "cuadrado".

Contraste (revisado al cerrar el estilo del taller): todos los textos pasan AA (4,5:1)
sobre la tarjeta y sobre la mesa en los dos temas; el más justo es `--faint` sobre el
marco de Azul (4,56:1). `--inerte` (2:1) es solo para chevrons decorativos y controles
apagados, nunca para texto que haya que leer.

## Componentes
Todos los componentes de interfaz salen de **shadcn/ui** (`components/ui`),
pintados con esta paleta: primario = azul del logo, destructivo = rojo, bordes y
fondos de los neutros entintados. Botón principal sólido azul (uno a la vista por
pantalla); Cancelar y lo secundario, gris relleno o de contorno; los de solo ícono,
círculos (`IconButton forma`: gris en tarjetas, blanco en la cabecera, suelto en barras).
Nada de botones hechos a mano en las pantallas.

## Reglas
- En Azul, neutros entintados al azul; en Noche, negro de verdad (lo pidió el dueño).
- Sombras suaves tintadas al azul (no negro duro); en Noche no hay sombras.
- Tipografía única del sistema Apple (SF Pro vía `--font-ios`); cifras con clase `.tnum`
  (misma fuente con `tabular-nums`). Sin webfonts.
- Sin grano. El único halo es el velo azul del lienzo en Noche.
- Marca: cuadro azul con pulso (diagnóstico) blanco y pico rojo — guiño al logo.
- Motion: CSS y Framer Motion (sin GSAP). Una sola curva, la del cajón de iOS
  (`--ease-ios`, `lib/movimiento.ts`), con 120 ms (color, foco), 220 ms (entrar o salir,
  pastillas, plegables, filas) y 420 ms (hojas, bloques). Rebote solo en la lupa y la
  pastilla de la barra de abajo. Todo respeta `prefers-reduced-motion`: sin bloques, sin
  cuentas, barras ya crecidas, sin lupa ni barra que se encoge, hojas sin arrastre y tema
  de golpe.
- Gestos del celular, siempre atajos de un botón que está a la vista: atrás cierra la
  ventana de arriba, jalar arriba del todo actualiza, y en el iPhone con la app instalada
  se vuelve deslizando desde el borde. Ninguno guarda, borra ni cobra por sí solo.

## Anti-slop
- Nada de "fintech navy+gold" (era el tema viejo); el negro puro es solo el lienzo de Noche.
- Sin gradient-text, sin glassmorphism decorativo, sin bordes laterales de color.

## Vidrio (capa flotante)
El vidrio es para lo que FLOTA sobre el contenido, nunca para el contenido mismo:
- La barra de abajo del celular (`.gbar`, con desenfoque y su lupa) es la única cápsula
  de vidrio. La barra de arriba del celular es material translúcido de lado a lado
  (`.barra-material`), no una cápsula.
- Tarjetas, ventanas, menús, el chat del cruce y su barra de escribir son sólidos, porque
  llevan cifras o se abren encima de texto.
- Botones y controles: los de shadcn/ui (ver CLAUDE.md), sólidos, sin vidrio.
