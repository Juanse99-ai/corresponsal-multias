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
  fino separa). Se cambian con el sol/luna del riel (computador) o el interruptor del menú
  (celular).
- **Marco** (computador, `.marco`): la app es una ventana de 30 px de esquina sobre un
  lienzo con degradado suave (`--lienzo`, `--marco`, `--marco-sombra`). La barra de arriba
  queda dentro, transparente.
- **Riel + panel** (`components/shell/riel-panel.tsx`): un ícono por grupo (Principal,
  Administración; el elegido es un círculo azul, punto rojo si el grupo escondido tiene
  algo urgente). Al lado, el panel del grupo (`--panel`): nombre, buscador de día o
  persona, secciones con el contador de préstamos en gris y quién entró. Al pie del riel:
  tema, iniciales (avisos y cerrar sesión) y esconder el panel. El celular conserva su
  barra y su menú azul marino.
- **Tarjetas** de 24 px, tenues (`--surface`), borde de luz (`--tarjeta-borde`) y sombra
  suave (`--tarjeta-sombra`). En el computador, las filas de una tabla dentro de una
  tarjeta son cajitas (`--fila`, `--fila-borde`) separadas 6 px.
- **Lo elegido** (pestaña, ítem del panel) es pastilla blanca (`--blanco`) con sombra.
- **Campos rellenos**: gris `--campo` sin borde, 16 px de esquina; al escribir, blancos con
  el aro azul. Rótulo en gris, encima del campo.
- **Ventanas**: sin filetes, fondo `--blanco`, título de 22 px (17 en el celular), ícono en
  un círculo de 44 px junto al título (`DialogHeader icono tono`; las confirmaciones, rojo),
  Cancelar gris relleno; entran creciendo desde 0,95.
- **Pantallas por bloques**: cabecera y cada tarjeta entran una tras otra, 45 ms entre
  bloques (`app/(app)/template.tsx`).
- **Títulos** grandes en peso medio con la miga de pan encima en el computador
  ("Principal › Cuadre diario", `--miga` que pone el AppShell).
- **Versión nueva**: pastilla oscura flotante arriba al centro (`.version-nueva`).

No se tomó: la fuente Inter del taller (aquí sigue SF Pro), la barra de avance de la OT (el
corresponsal no tiene un proceso por pasos) ni el selector de tema con miniaturas (el
taller lo tiene en Configuración y esta app no tiene esa pantalla).

## Paleta (del logo: azul + rojo + blanco)

Tokens en `app/globals.css`, con valores para Azul (`:root`) y Noche (`.dark`).

| Rol | Token | Uso |
|---|---|---|
| Lienzo | `--lienzo` / `--bg` | fondo de página |
| Marco | `--marco`, `--panel` | ventana del computador y panel del menú |
| Superficie | `--surface` (tenue) | tarjetas |
| Blanco | `--blanco` | lo elegido, ventanas, menús |
| Campos | `--campo` / `--campo-hover` | campos rellenos |
| Filas | `--fila` / `--fila-borde` | cajitas de las tablas |
| Borde | `--line` / `--line-strong` | bordes sólidos suaves |
| Texto | `--text`, `--muted`, `--faint` | cuerpo, rótulos, ayudas |
| Acento | `--accent` (texto) / `--accent-fill` (relleno) | botones, links, activo |
| Éxito | `--success` verde | cuadrado / a favor |
| Peligro | `--danger` **rojo del logo** | descuadre / negativos |
| Menú celular | `--nav-*` **azul marino** | menú del celular y banda del login |

Estrategia de color: **restrained-committed** — neutros + azul como acento, rojo solo
para estado negativo, verde solo para "cuadrado".

## Componentes
Todos los componentes de interfaz salen de **shadcn/ui** (`components/ui`),
pintados con esta paleta: primario = azul del logo, destructivo = rojo, bordes y
fondos de los neutros entintados. Botón principal sólido azul; secundario gris
claro; los de ícono, fantasma. Nada de botones hechos a mano en las pantallas.

## Reglas
- En Azul, neutros entintados al azul; en Noche, negro de verdad (lo pidió el dueño).
- Sombras suaves tintadas al azul (no negro duro); en Noche no hay sombras.
- Tipografía única del sistema Apple (SF Pro vía `--font-ios`); cifras con clase `.tnum`
  (misma fuente con `tabular-nums`). Sin webfonts.
- Sin grano. El único halo es el velo azul del lienzo en Noche.
- Marca: cuadro azul con pulso (diagnóstico) blanco y pico rojo — guiño al logo.
- Motion: GSAP en componentes hoja aislados (`components/fx/`) y login; Framer Motion en el
  resto, sin mezclar ambos en el mismo árbol. Ease-out (`power4`/`expo`), **sin rebote**.
  Todo respeta `prefers-reduced-motion` (helper `components/fx/reduced.ts`).

## Anti-slop
- Nada de negro puro ni "fintech navy+gold" (era el tema viejo).
- Sin gradient-text, sin glassmorphism decorativo, sin bordes laterales de color.

## Liquid Glass (capa flotante)
Equivalente web del GlassEffect de iOS. El vidrio es para lo que FLOTA sobre el
contenido, nunca para el contenido mismo (tarjetas con cifras siguen sólidas):
- `.lg-panel`: barra superior (cápsula flotante), píldora de fecha del chat y
  compositor del Cruce con el grupo. Sigue el tema; texto con tokens normales.
- Menús desplegables y diálogos: `Popover` y `AlertDialog` de shadcn, sólidos,
  porque se abren encima de texto.
- Botones y controles: los de shadcn/ui (ver CLAUDE.md), sólidos, sin vidrio.
