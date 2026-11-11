"use client";

import { useLayoutEffect, useRef } from "react";
import { Logo } from "@/components/brand";
import { reduced } from "@/components/fx/reduced";

/** Reposo; esperando al servidor (el pulso corre); entró (se traza la llave). */
export type FaseEntrar = "reposo" | "espera" | "ok";

// La banda tarda 420 ms en llenar la pantalla; el pulso asoma a los 300.
const CRECE = 560;
// El trazo completo, con la llave, y un momento quieto antes del paso.
const TRAZO = 520;
const QUIETO = 160;

// Medidas del pulso en px (la escena mide 128 de alto y el logo 120).
const BASE = 88;
const LATIDO = "l7 -6 l7 6 h9 l6 11 l11 -43 l11 54 l7 -22 h11 l9 -10 l9 10";
const ANCHO_LATIDO = 87;

/** La línea del logo: un latido a la izquierda, pasa por detrás del logo y, en
 *  `llave`, termina dibujando la llave a la derecha. `ancho` es el de la pantalla. */
function trazo(ancho: number, llave: boolean): string {
  const centro = ancho / 2;
  const inicio = Math.max(0, centro - 74 - ANCHO_LATIDO);
  const linea = `M0 ${BASE} H${inicio} ${LATIDO}`;
  if (!llave) return `${linea} H${ancho}`;
  const x = centro + 100;
  return (
    `${linea} H${x - 7} V48.1 A18.5 18.5 0 0 1 ${x - 6.5} 13.7 V31 H${x + 6.5} V13.7 ` +
    `A18.5 18.5 0 0 1 ${x + 7} 48.1 V${BASE} H${ancho}`
  );
}

/** Deja `el` (de la escena) puesto sobre su par de la banda: de ahí sale. */
function desde(el: HTMLElement, par: Element | undefined) {
  el.style.transform = "none";
  if (!par) return;
  const a = el.getBoundingClientRect();
  const b = par.getBoundingClientRect();
  if (!a.width || !b.width) return;
  el.style.setProperty("--desde", `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`);
  el.style.transform = "";
}

/** El par visible en la banda (la del celular o el panel del computador). */
function enBanda(banda: Element, que: string): Element | undefined {
  return [...banda.querySelectorAll(`[data-marca="${que}"]`)].find((e) => e.getBoundingClientRect().width > 0);
}

/**
 * Pantalla de marca al entrar (11 nov 2026, la eligió el dueño): mientras el
 * servidor contesta, la banda de marca crece hasta llenar la pantalla, el logo
 * baja al centro y la línea de pulso del logo cruza de lado a lado. Al entrar,
 * la línea se traza completa y termina en la llave; ese cuadro queda quieto y
 * es el que empuja el Panel (lib/paso-entrar.ts). Con la clave mala, la banda
 * se recoge. Los estilos están en globals.css (.escena-entrar); con "reducir
 * movimiento" no sale y queda el botón con "Entrando…".
 */
export function EscenaEntrar({ fase, alTerminar }: { fase: FaseEntrar; alTerminar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const abiertaEn = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (fase === "reposo") {
      el.dataset.fase = "cerrada";
      return;
    }

    if (fase === "espera") {
      if (reduced()) return;
      const banda = [...document.querySelectorAll("[data-marca-banda]")].find(
        (b) => b.getBoundingClientRect().width > 0,
      );
      if (!banda) return;
      // La escena arranca con la forma de la banda y sus cosas en el mismo sitio.
      // Se acomoda sin transiciones: si viene de una clave mala, lo anterior no
      // debe animarse hacia lo nuevo mientras se mide.
      const piezas = [...el.querySelectorAll<HTMLElement>("[data-escena]")];
      const todo = [el, ...piezas];
      todo.forEach((x) => (x.style.transition = "none"));
      const r = banda.getBoundingClientRect();
      const radio = getComputedStyle(banda).borderBottomLeftRadius || "0px";
      const ancho = window.innerWidth;
      el.style.setProperty(
        "--escena-clip",
        `inset(${r.top}px ${ancho - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 0px 0px ${radio} ${radio})`,
      );
      piezas.forEach((pieza) => desde(pieza, enBanda(banda, pieza.dataset.escena ?? "")));
      // El pulso, a la medida de esta pantalla: en una ancha tarda más en cruzar.
      const svg = el.querySelector("svg");
      svg?.setAttribute("viewBox", `0 0 ${ancho} 128`);
      svg?.querySelectorAll("path").forEach((p) => p.setAttribute("d", trazo(ancho, p.dataset.llave === "si")));
      el.style.setProperty("--pulso-dur", `${Math.min(2.6, Math.max(1.4, ancho / 560))}s`);
      void el.offsetWidth;
      todo.forEach((x) => (x.style.transition = ""));
      el.dataset.fase = "abierta";
      abiertaEn.current = performance.now();
      return;
    }

    // Entró. Sin escena en pantalla (reducir movimiento), se pasa de una.
    if (el.dataset.fase !== "abierta") {
      alTerminar();
      return;
    }
    // Si el servidor contestó muy rápido, primero termina de crecer la banda.
    const falta = Math.max(0, CRECE - (performance.now() - abiertaEn.current));
    const t1 = setTimeout(() => {
      el.dataset.fase = "ok";
    }, falta);
    const t2 = setTimeout(alTerminar, falta + TRAZO + QUIETO);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fase, alTerminar]);

  return (
    <div ref={ref} className="escena-entrar" data-fase="cerrada" aria-hidden="true">
      <div className="relative flex w-full justify-center">
        <svg className="escena-pulso" preserveAspectRatio="none">
          <path className="escena-pulso-base" pathLength={1} />
          <g className="escena-pulso-corre">
            <path pathLength={1} />
          </g>
          <path className="escena-pulso-fin" pathLength={1} data-llave="si" />
        </svg>
        <div data-escena="logo" className="escena-pieza relative">
          <Logo size={120} className="rounded-[2rem]" />
        </div>
      </div>
      <div data-escena="texto" className="escena-pieza text-center leading-tight">
        <p className="text-body font-semibold text-nav-text lg:text-lead lg:tracking-[-0.3px]">
          Barrio Centro Sabanalarga 18
        </p>
        <p className="mt-0.5 text-meta text-nav-muted lg:mt-1 lg:text-body">Multidiagnósticos AS</p>
      </div>
    </div>
  );
}
