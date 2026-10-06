"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * La pastilla de la opción elegida de un segmentado viaja de una opción a otra,
 * como el control segmentado de iOS, en vez de saltar. Se mide la opción
 * elegida (hijo directo con data-state "active" en Tabs u "on" en ToggleGroup)
 * y el riel la pinta en su ::before (globals.css, [data-pastilla]). La primera
 * vez se pone en su sitio sin animar; desde ahí, al cambiar, viaja. Se vuelve a
 * medir si cambia el ancho (la elegida va en negrita, gira el celular).
 * Sin JavaScript la opción elegida se pinta sola, así que se ve igual.
 */
export function usePastilla(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const on = el.querySelector<HTMLElement>(':scope > [data-state="active"], :scope > [data-state="on"]');
      if (!on) {
        el.removeAttribute("data-pastilla");
        return;
      }
      el.style.setProperty("--pastilla-x", `${on.offsetLeft}px`);
      el.style.setProperty("--pastilla-y", `${on.offsetTop}px`);
      el.style.setProperty("--pastilla-w", `${on.offsetWidth}px`);
      el.style.setProperty("--pastilla-h", `${on.offsetHeight}px`);
      el.setAttribute("data-pastilla", "");
    };
    medir();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(medir) : null;
    if (ro) {
      ro.observe(el);
      for (const hijo of el.children) ro.observe(hijo);
    }
    // Radix cambia data-state al elegir; también entran o salen opciones.
    const mo = new MutationObserver(medir);
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] });
    void document.fonts?.ready.then(medir);
    // Animar solo después del primer dibujo: al abrir la pantalla no viaja.
    const cuadro = requestAnimationFrame(() => el.setAttribute("data-pastilla-anima", ""));
    return () => {
      ro?.disconnect();
      mo.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, [ref]);
}
