# DESIGN.md — Corresponsal · Multidiagnósticos AS

Registro: **product** (app de operación interna). Escena que fija el tema: Ivana operando
todo el día desde un PC en un local iluminado, leyendo cifras de plata → **tema claro**.

## Paleta (del logo: azul + rojo + blanco)

Definida en OKLCH, neutros entintados al azul (`app/globals.css`).

| Rol | Token | Uso |
|---|---|---|
| Lienzo | `--bg` claro frío | fondo de página |
| Superficie | `--surface` (~blanco) | tarjetas |
| Inputs | `--surface-2` | campos |
| Borde | `--line` / `--line-strong` | bordes sólidos suaves |
| Texto | `--text` azul marino oscuro (no negro) | cuerpo |
| Acento | `--accent` **azul royal del logo** | botones, links, activo |
| Éxito | `--success` verde | cuadrado / a favor |
| Peligro | `--danger` **rojo del logo** | descuadre / negativos |
| Riel | `--nav-*` **azul marino** | barra lateral (no negra) |

Estrategia de color: **restrained-committed** — neutros claros + azul como acento, rojo solo
para estado negativo, verde solo para "cuadrado". El riel lateral azul marino da el contraste
"riel oscuro / lienzo claro" sin usar negro.

## Reglas
- Nunca `#000`/`#fff`; todo entintado al azul.
- Sombras suaves tintadas al azul (no negro duro).
- Tipografía única del sistema Apple (SF Pro vía `--font-ios`); cifras con clase `.tnum`
  (misma fuente con `tabular-nums`). Sin webfonts.
- Sin grano. Halo ambiental azul muy sutil.
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
- `.lg-panel .lg-panel-thick`: menús desplegables y hoja de confirmación. Casi
  opaco, porque se abre encima de texto y un vidrio dentro de otro no desenfoca.
- `.lg-glass*` / `.lg-liquid*`: botones y toggles (ya existían).
