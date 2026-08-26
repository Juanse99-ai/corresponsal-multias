"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { MoonStars } from "@phosphor-icons/react/dist/ssr";
import { reduced } from "@/components/fx/reduced";
import { despedidaDelDia } from "@/lib/saludos";

gsap.registerPlugin(DrawSVGPlugin, SplitText);

// Todo en tokens de marca: azules del acento, el verde de "cuadrado" y un neutro.
const COLORES = ["oklch(0.515 0.172 258)", "oklch(0.64 0.15 255)", "oklch(0.585 0.13 155)", "oklch(0.74 0.10 155)", "oklch(0.95 0.01 255)"];

/** Despedida al cerrar el día: confeti + check si quedó cuadrado, mensaje cálido.
 *  Se queda hasta que la persona toca/presiona (no se cierra sola). */
export function CelebracionCierre({ play, nombre, cuadrado }: { play: number; nombre: string; cuadrado: boolean }) {
  const [mounted, setMounted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => setMounted(true), []);

  useGSAP(
    () => {
      if (play <= 0 || !root.current) return;
      root.current.focus({ preventScroll: true });
      gsap.set(root.current, { display: "flex", autoAlpha: 1 });

      if (reduced()) {
        const t = gsap.timeline();
        t.fromTo(".cc-frost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
          .fromTo(".cc-card", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
          .fromTo(".cc-hint", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
        tl.current = t;
        return;
      }

      const split = new SplitText(".cc-title", { type: "chars" });
      const t = gsap.timeline();
      t.fromTo(".cc-frost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
        .fromTo(".cc-badge", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: "power4.out" }, "-=0.1");
      if (cuadrado) {
        t.fromTo(".cc-ring", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "-=0.3")
          .fromTo(".cc-check", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.32, ease: "power2.out" }, "-=0.1");
      }
      t.from(split.chars, { yPercent: 120, autoAlpha: 0, stagger: 0.03, duration: 0.45, ease: "power3.out" }, "-=0.1")
        .from(".cc-sub", { y: 10, autoAlpha: 0, duration: 0.4 }, "-=0.2")
        .from(".cc-hint", { autoAlpha: 0, duration: 0.4 }, "-=0.1");
      if (cuadrado) t.add(() => lanzarConfetti(confettiRef.current), "-=0.55");
      tl.current = t;

      return () => split.revert();
    },
    { scope: root, dependencies: [play] },
  );

  if (!mounted) return null;

  const primer = nombre.split(/\s+/)[0] || nombre;
  const fechaBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const despedida = despedidaDelDia(fechaBogota);

  function saltar() {
    if (!root.current) return;
    tl.current?.kill();
    gsap.to(root.current, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.out",
      onComplete: () => {
        if (root.current) gsap.set(root.current, { display: "none" });
      },
    });
  }

  return createPortal(
    <div
      ref={root}
      onClick={saltar}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") saltar();
      }}
      role="dialog"
      aria-label={`Hasta mañana, ${primer}`}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden outline-none"
      style={{ display: "none" }}
    >
      <div
        className="cc-frost absolute inset-0"
        style={{
          backgroundColor: "oklch(0.16 0.02 265 / 0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      />
      <div className="cc-card relative z-10 flex flex-col items-center gap-3.5 px-8 text-center">
        <div ref={confettiRef} className="pointer-events-none absolute -top-2 left-1/2 h-0 w-0" />
        <div
          className={cuadrado ? "cc-badge flex h-24 w-24 items-center justify-center rounded-full bg-success-soft" : "cc-badge flex h-24 w-24 items-center justify-center rounded-full bg-[oklch(0.4_0.08_265/0.4)] text-white/90"}
        >
          {cuadrado ? (
            <svg viewBox="0 0 100 100" className="h-20 w-20">
              <circle className="cc-ring" cx="50" cy="50" r="42" fill="none" stroke="oklch(0.585 0.13 155)" strokeWidth="5" strokeLinecap="round" />
              <path className="cc-check" d="M30 51 L44 65 L71 35" fill="none" stroke="oklch(0.585 0.13 155)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <MoonStars size={40} weight="fill" />
          )}
        </div>
        <p className="cc-title text-2xl font-semibold tracking-tight text-white sm:text-3xl">¡Hasta mañana, {primer}!</p>
        <p className="cc-sub text-[0.95rem] text-white/80">{cuadrado ? despedida : "Día cerrado con diferencia, revísalo mañana."}</p>
      </div>
      <p className="cc-hint pointer-events-none absolute bottom-9 left-0 right-0 z-10 text-center text-[0.82rem] text-white/55">
        toca para continuar
      </p>
    </div>,
    document.body,
  );
}

function lanzarConfetti(container: HTMLElement | null) {
  if (!container) return;
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.round(Math.random() * 7);
    const redondo = Math.random() > 0.5;
    p.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:${redondo ? "50%" : "2px"};background:${COLORES[i % COLORES.length]};`;
    container.appendChild(p);
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 210;
    gsap.fromTo(
      p,
      { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 },
      {
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist + 170,
        rotation: Math.random() * 540 - 270,
        scale: 0.3,
        opacity: 0,
        duration: 1.2 + Math.random() * 0.7,
        ease: "power2.out",
        onComplete: () => p.remove(),
      },
    );
  }
}
