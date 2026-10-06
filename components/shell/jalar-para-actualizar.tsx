"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { contarAbiertas } from "@/lib/use-atras-cierra-ventanas";

const UMBRAL = 70; // px que baja el dedo para que actualice
const ARRANQUE = 8;
const MINIMO_MS = 650;
const ARRIBA = -48; // px: el círculo escondido detrás de la barra de arriba
// Donde el dedo hace otra cosa, el jalón no arranca.
const NO_JALA = "input,textarea,select,[contenteditable=true],.gbar,[data-slot=sheet-content],[data-slot=dialog-content]";

/**
 * Jalar para actualizar (guía 8.22), solo en el celular: arriba del todo, sin
 * ventanas abiertas y fuera de campos y de la barra, jalar hacia abajo baja un
 * círculo con la flecha de recargar (la mitad de lo que baja el dedo, girando).
 * Al pasar 70 px se pone azul y, al soltar, vibra, gira mientras vuelve a leer
 * los datos con router.refresh() (mínimo 650 ms) y sube. Un jalón corto no hace
 * nada. El rebote del navegador está apagado en globals.css
 * (overscroll-behavior), si no chocaría con este.
 */
export function JalarParaActualizar() {
  const router = useRouter();
  const [leyendo, empezar] = useTransition();
  const [cargando, setCargando] = useState(false);
  const circulo = useRef<HTMLDivElement>(null);
  const desde = useRef(0);
  const ocupado = useRef(false);

  const esconder = () => {
    const el = circulo.current;
    if (!el) return;
    el.style.transition = "transform 220ms var(--ease-ios), opacity 220ms var(--ease-ios)";
    el.style.transform = `translate(-50%, ${ARRIBA}px)`;
    el.style.opacity = "0";
    el.removeAttribute("data-listo");
  };

  // Ya leyó (y pasó el mínimo): sube y se va.
  useEffect(() => {
    if (!cargando || leyendo) return;
    const t = setTimeout(() => {
      ocupado.current = false;
      setCargando(false);
      esconder();
    }, Math.max(0, MINIMO_MS - (performance.now() - desde.current)));
    return () => clearTimeout(t);
  }, [cargando, leyendo]);

  useEffect(() => {
    const el = circulo.current;
    if (!el) return;

    const pintar = (dy: number) => {
      el.style.transition = "none";
      el.style.opacity = String(Math.min(1, dy / 40));
      el.style.transform = `translate(-50%, ${Math.min(dy, UMBRAL * 2) / 2 + ARRIBA}px) rotate(${dy * 2.5}deg)`;
      el.toggleAttribute("data-listo", dy >= UMBRAL);
    };

    const alTocar = (e: TouchEvent) => {
      if (ocupado.current || e.touches.length !== 1) return;
      if (!window.matchMedia("(max-width: 1023px)").matches) return;
      if (window.scrollY > 0 || contarAbiertas() > 0) return;
      if (e.target instanceof Element && e.target.closest(NO_JALA)) return;
      const x0 = e.touches[0].clientX;
      const y0 = e.touches[0].clientY;
      let dy = 0;
      let activo = false;

      const mover = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        dy = t.clientY - y0;
        if (!activo) {
          // Hacia arriba es leer la página; de lado, otro gesto.
          if (dy < -ARRANQUE / 2 || Math.abs(t.clientX - x0) > ARRANQUE) return terminar(false);
          if (dy <= ARRANQUE) return;
          if (window.scrollY > 0) return terminar(false);
          activo = true;
        }
        if (ev.cancelable) ev.preventDefault();
        pintar(Math.max(0, dy));
      };
      const soltar = () => terminar(true);
      const terminar = (soltando: boolean) => {
        window.removeEventListener("touchmove", mover);
        window.removeEventListener("touchend", soltar);
        window.removeEventListener("touchcancel", cancelar);
        if (!activo) return;
        if (!soltando || dy < UMBRAL) return esconder();
        // Actualiza: vibra, se queda girando a la altura del umbral y lee.
        navigator.vibrate?.(10);
        ocupado.current = true;
        desde.current = performance.now();
        el.style.transition = "transform 220ms var(--ease-ios)";
        el.style.transform = `translate(-50%, ${UMBRAL / 2 + ARRIBA}px)`;
        setCargando(true);
        empezar(() => router.refresh());
      };
      const cancelar = () => terminar(false);

      window.addEventListener("touchmove", mover, { passive: false });
      window.addEventListener("touchend", soltar);
      window.addEventListener("touchcancel", cancelar);
    };

    window.addEventListener("touchstart", alTocar, { passive: true });
    return () => window.removeEventListener("touchstart", alTocar);
  }, [router]);

  return (
    <>
      <div
        ref={circulo}
        aria-hidden
        className="pointer-events-none fixed left-1/2 z-30 grid size-10 place-items-center rounded-full bg-blanco text-muted opacity-0 shadow-[0_4px_14px_rgba(15,23,42,0.18)] data-[listo]:bg-accent-fill data-[listo]:text-white lg:hidden"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)", transform: `translate(-50%, ${ARRIBA}px)` }}
      >
        <ArrowClockwise size={20} weight="bold" className={cn(cargando && "animate-spin")} />
      </div>
      <p role="status" className="sr-only">
        {cargando ? "Actualizando" : ""}
      </p>
    </>
  );
}
