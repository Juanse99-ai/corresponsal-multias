# GSAP en App Corresponsal — guía y aprendizajes

Resumen práctico de cómo usamos GSAP en este proyecto, con los patrones, trucos
y errores que fuimos descubriendo. Sirve de referencia para futuras animaciones.

## Setup

- **GSAP 3.15 por npm** (no CDN, porque es Next.js/React). `package.json`:
  `"gsap": "^3.15.0"`, `"@gsap/react": "^2.1.2"`.
- **Todos los plugins son gratis** desde GSAP 3.13 (Webflow los liberó). En 3.15 el
  paquete de npm trae las versiones **completas** (no "trial"), **sin candado de
  dominio** → funcionan en producción. Verificado: no hay `location/hostname` ni
  licencia en `node_modules/gsap/MorphSVGPlugin.js`, `DrawSVGPlugin.js`, `SplitText.js`.
- Los deep-imports `gsap/MorphSVGPlugin` resuelven por el campo `exports` (`./*`).
- **Siempre verificar con `npm run build`** (no solo `tsc --noEmit`): GSAP + SSR.
  Los plugins importan bien en SSR; el build pasa.

```ts
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin, SplitText); // a nivel de módulo
```

## Reglas del proyecto (no romper)

- **GSAP solo en componentes hoja AISLADOS** (`components/fx/`), nunca mezclado con
  **Framer Motion** en el mismo árbol. Si una lista ya usa Framer (p.ej.
  `movimientos-manager`), el efecto se hace **con Framer**, no con GSAP.
- **Eases sin rebote** en la app (`power4.out`, `expo.out`). El rebote/elastic se
  ve "de juguete". **Excepción: la bienvenida** (`back.out`, playful), porque es el
  momento expresivo; el resto de la app va calmado.
- **Acento azul** (`var(--accent)`), nunca dorado (el "navy+gold" es el tema viejo
  prohibido por `DESIGN.md`).
- Todo respeta **`prefers-reduced-motion`** (helper `components/fx/reduced.ts`).

## Patrón base con useGSAP

`useGSAP(fn, { scope, dependencies })` corre en layout-effect, limpia solo al
desmontar y **scopea los selectores string** a `scope.current`.

```tsx
const root = useRef<HTMLDivElement>(null);
useGSAP(() => {
  const tl = gsap.timeline();
  tl.from(".cosa", { y: 20, autoAlpha: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 });
  return () => { /* cleanup extra, p.ej. split.revert() */ };
}, { scope: root, dependencies: [algo] });
```

- `useGSAP` por defecto **NO revierte** al cambiar dependencias (`revertOnUpdate:false`),
  solo al desmontar. Útil saberlo para morphs/estado.
- Dentro del callback, `gsap.utils.toArray(".x")` y los selectores string ya están
  scopeados al `scope`.

## Plugins y para qué los usamos

- **MorphSVG** — morphear un `<path>` entre formas. `morphSVG` acepta **un string de
  path** como destino:
  ```ts
  gsap.to(".glifo", { morphSVG: "M6 12 L18 12", duration: 0.5 });
  ```
  - Morphea entre paths con **distinto número de puntos** (los resamplea).
  - **Solo `<path>`**, y **un solo color de relleno** por path (no se puede el centro
    amarillo de una flor ni ruedas de otro color, si esa figura morphea).
  - Ejemplo de morph en bucle entre varias formas (bienvenida): cada path cicla
    `flor → carro → corazón → estrella` con timelines desfasadas.
- **DrawSVG** — "dibujar" un trazo (el check del cierre):
  ```ts
  gsap.fromTo(".check", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.35 });
  ```
- **SplitText** — texto kinético (letras/palabras). Acuérdate de `split.revert()` en
  el cleanup:
  ```ts
  const split = new SplitText(".titulo", { type: "chars" }); // o "words"
  gsap.from(split.chars, { yPercent: 120, autoAlpha: 0, stagger: 0.03 });
  return () => split.revert();
  ```

## Trucos / gotchas que aprendimos

- **No tween de color con tokens OKLCH** (no interpolan bien). Dos salidas:
  1. Toggle de clase (`text-danger`/`text-success`) + `transition-colors` y
     `currentColor` (lo usa `saldo-vivo`).
  2. Color concreto `rgba(...)` cuando es animación JS (flash verde, confeti).
- **Float/rotación perpetua**: tween aparte con `yoyo:true, repeat:-1, ease:"sine.inOut"`.
  Corre independiente del timeline de entrada (anima `y/rotation` del wrapper, no choca
  con el morph del path).
- **Overlay a pantalla completa**: `createPortal(..., document.body)` + `fixed inset-0
  z-[200]`. Fondo desenfocado con `backdrop-filter: blur()` + tinte oscuro
  (`oklch(0.16 0.02 265 / 0.82)`). Ojo con el rendimiento del blur (usar grados
  moderados).
- **"Solo se cierra al tocar"**: el timeline de entrada **no** hace auto-hide ni
  `onComplete:setShow(false)`; se queda. Un `saltar()` (onClick/onKeyDown Esc) mata el
  timeline y hace el fade-out. Mostrar un "toca para continuar".
- **Math.random()** sirve en JS del navegador (confeti, ángulos), **pero NO** en
  scripts de Workflow del harness.
- **`back.out(n)` overshoot** está bien en la bienvenida; en la app, usar `power4.out`.

## Dónde está cada cosa (`components/fx/`)

- `bienvenida-splash.tsx` — splash de bienvenida: fondo borroso, formas
  (flor/carro/corazón/estrella) que flotan y **morphean** entre sí, secuencia de
  textos (SplitText), logo. Sale las **2 primeras veces del día** (localStorage,
  hora Bogotá) o forzado con `?bienvenida=1`. Cierra solo con click. Genera la flor
  con una función (pétalos de gota) y define los paths de carro/corazón/estrella.
- `celebracion-cierre.tsx` — **despedida** al cerrar el día: confeti + check (DrawSVG)
  si quedó cuadrado, luna si no; mensaje cálido. También cierra solo con click.
- `saldo-vivo.tsx` — el saldo **rueda** (tween de número) y un glifo **morphea**
  (línea ↔ check) según cuadre/descuadre.
- `saludo-gsap.tsx` — saludo del Panel con SplitText.
- `ripple.ts` — onda en color de acento (imperativo, sin componente).
- `reduced.ts` — helper `prefers-reduced-motion`.

## Mini-receta para una animación nueva

1. Componente hoja `"use client"` en `components/fx/`, aislado (sin Framer adentro).
2. `useGSAP({ scope })`, timeline con `from/to/fromTo`, `stagger`, ease `power/expo`.
3. ¿SVG? `<path>` para MorphSVG; trazo para DrawSVG; texto con SplitText.
4. Respetar `reduced()` (versión simple o saltar).
5. `npm run build` para confirmar SSR. Commit firmado y deploy a prod.
