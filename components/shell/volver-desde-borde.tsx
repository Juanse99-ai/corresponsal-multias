"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { contarAbiertas } from "@/lib/use-atras-cierra-ventanas";

const BORDE = 22; // px desde la izquierda donde arranca
const UMBRAL = 70; // px de lado para volver
const VERTICAL = 40; // si el dedo se va más que esto en vertical, se cancela
const ESCONDIDO = -44; // px: el círculo fuera de la pantalla

/**
 * Volver deslizando desde el borde (guía 8.22). Solo en el iPhone con la app
 * instalada, donde no hay gesto de atrás: deslizar desde los primeros 22 px de
 * la izquierda hace history.back() al pasar 70 px. Sale una flecha en un
 * círculo de 40 px que se pone azul al alcanzar; se cancela si el dedo se va
 * más de 40 px en vertical. Con una ventana abierta no arranca.
 */
export function VolverDesdeBorde() {
  const circulo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const instalada = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const el = circulo.current;
    if (!instalada || !el) return;

    const esconder = () => {
      el.style.transition = "transform 220ms var(--ease-ios), opacity 220ms var(--ease-ios)";
      el.style.transform = `translateX(${ESCONDIDO}px)`;
      el.style.opacity = "0";
      el.removeAttribute("data-listo");
    };

    const alTocar = (e: TouchEvent) => {
      const t0 = e.touches[0];
      if (e.touches.length !== 1 || !t0 || t0.clientX > BORDE || contarAbiertas() > 0) return;
      const x0 = t0.clientX;
      const y0 = t0.clientY;
      let dx = 0;
      let activo = false;
      el.style.top = `${Math.round(y0 - 20)}px`;

      const mover = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        dx = t.clientX - x0;
        const dy = Math.abs(t.clientY - y0);
        if (dy > VERTICAL) return terminar(false);
        if (!activo) {
          if (dx <= 8 || dx < dy) return;
          activo = true;
        }
        if (ev.cancelable) ev.preventDefault();
        const x = Math.min(ESCONDIDO + (Math.max(0, dx) * (12 - ESCONDIDO)) / UMBRAL, 16);
        el.style.transition = "none";
        el.style.opacity = String(Math.min(1, dx / 30));
        el.style.transform = `translateX(${x}px)`;
        el.toggleAttribute("data-listo", dx >= UMBRAL);
      };
      const soltar = () => terminar(true);
      const cancelar = () => terminar(false);
      const terminar = (soltando: boolean) => {
        window.removeEventListener("touchmove", mover);
        window.removeEventListener("touchend", soltar);
        window.removeEventListener("touchcancel", cancelar);
        if (!activo) return;
        esconder();
        if (soltando && dx >= UMBRAL) history.back();
      };

      window.addEventListener("touchmove", mover, { passive: false });
      window.addEventListener("touchend", soltar);
      window.addEventListener("touchcancel", cancelar);
    };

    window.addEventListener("touchstart", alTocar, { passive: true });
    return () => window.removeEventListener("touchstart", alTocar);
  }, []);

  return (
    <div
      ref={circulo}
      aria-hidden
      className="pointer-events-none fixed left-0 z-30 grid size-10 place-items-center rounded-full bg-blanco text-muted opacity-0 shadow-[0_4px_14px_rgba(15,23,42,0.18)] data-[listo]:bg-accent-fill data-[listo]:text-white lg:hidden"
      style={{ transform: `translateX(${ESCONDIDO}px)` }}
    >
      <ArrowLeft size={20} weight="bold" />
    </div>
  );
}
