"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { Sun, CloudSun, MoonStars } from "@phosphor-icons/react/dist/ssr";
import { saludoHora, mensajeDelDia } from "@/lib/saludos";
import { reduced } from "@/components/fx/reduced";

gsap.registerPlugin(SplitText);

/** Bienvenida a pantalla completa al abrir la app: app borrosa detrás + saludo y
 *  mensaje del día en grande, con transición de salida. Una vez por sesión. */
export function BienvenidaSplash({ nombre }: { nombre: string }) {
  const [show, setShow] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Se muestra las primeras 2 veces que abre/recarga la app cada día (hora de Colombia).
    try {
      const hoy = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const key = `corr-bienvenida:${hoy}`;
      const veces = Number(localStorage.getItem(key) || "0");
      if (veces >= 2) return;
      localStorage.setItem(key, String(veces + 1));
    } catch {
      /* sin localStorage: la mostramos igual */
    }
    setShow(true);
  }, []);

  useGSAP(
    () => {
      if (!show || !root.current) return;
      root.current.focus({ preventScroll: true });

      if (reduced()) {
        tl.current = gsap.timeline({ onComplete: () => setShow(false) });
        tl.current
          .fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
          .to({}, { duration: 1.6 })
          .to(root.current, { autoAlpha: 0, duration: 0.4 });
        return;
      }

      const split = new SplitText(".bv-msg", { type: "words" });
      tl.current = gsap.timeline({ onComplete: () => setShow(false) });
      tl.current
        .fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" })
        .from(".bv-icon", { scale: 0, rotate: -90, autoAlpha: 0, duration: 0.6, ease: "power4.out" }, "-=0.1")
        .from(".bv-greet", { y: 14, autoAlpha: 0, duration: 0.5 }, "-=0.25")
        .from(split.words, { y: 24, autoAlpha: 0, stagger: 0.045, duration: 0.55, ease: "power3.out" }, "-=0.15")
        .from(".bv-hint", { autoAlpha: 0, duration: 0.5 }, "-=0.1")
        .to({}, { duration: 1.3 })
        .to(".bv-content", { y: -16, autoAlpha: 0, duration: 0.5, ease: "power2.in" })
        .to(root.current, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, "-=0.25");
      return () => split.revert();
    },
    { scope: root, dependencies: [show] },
  );

  if (!show) return null;

  const primer = nombre.split(/\s+/)[0];
  const ahora = new Date();
  const fechaBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const horaBogota = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(ahora),
  );
  const saludo = saludoHora(horaBogota);
  const mensaje = mensajeDelDia(fechaBogota);
  const Icono = saludo.includes("días") ? Sun : saludo.includes("tardes") ? CloudSun : MoonStars;

  function saltar() {
    if (!root.current) return;
    tl.current?.kill();
    gsap.to(root.current, { autoAlpha: 0, duration: 0.35, ease: "power2.out", onComplete: () => setShow(false) });
  }

  return createPortal(
    <div
      ref={root}
      onClick={saltar}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") saltar();
      }}
      role="dialog"
      aria-label={`${saludo}, ${primer}`}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[oklch(0.99_0.004_255/0.66)] outline-none backdrop-blur-md"
      style={{ opacity: 0 }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="bv-content relative flex flex-col items-center gap-5 px-6 text-center">
        <span className="bv-icon flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Icono size={28} weight="fill" />
        </span>
        <p className="bv-greet text-lg font-medium text-muted sm:text-xl">
          {saludo}, {primer}
        </p>
        <p className="bv-msg max-w-2xl text-[1.7rem] font-semibold leading-snug tracking-tight text-text sm:text-[2.2rem]">
          {mensaje}
        </p>
        <p className="bv-hint text-[0.8rem] text-faint">toca para continuar</p>
      </div>
    </div>,
    document.body,
  );
}
