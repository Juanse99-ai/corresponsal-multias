"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(DrawSVGPlugin, SplitText);

const COLORES = ["#C7A252", "#E2C77A", "#1d9e75", "#9FE1CB", "#bfe9cb"];

/** Celebración al cerrar un día cuadrado: confeti dorado + check que se dibuja + texto. */
export function CelebracionCierre({ play }: { play: number }) {
  const [mounted, setMounted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useGSAP(
    () => {
      if (play <= 0 || !root.current) return;
      gsap.set(root.current, { display: "flex", autoAlpha: 1 });

      const split = new SplitText(".cc-title", { type: "chars" });
      const tl = gsap.timeline({
        onComplete: () => {
          if (root.current) gsap.set(root.current, { display: "none" });
        },
      });

      tl.fromTo(".cc-back", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
        .fromTo(".cc-badge", { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2.4)" }, "-=0.1")
        .fromTo(".cc-ring", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "-=0.35")
        .fromTo(".cc-check", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.32, ease: "power2.out" }, "-=0.1")
        .from(split.chars, { yPercent: 120, autoAlpha: 0, stagger: 0.035, duration: 0.45, ease: "power3.out" }, "-=0.15")
        .from(".cc-sub", { y: 10, autoAlpha: 0, duration: 0.4 }, "-=0.2")
        .add(() => lanzarConfetti(confettiRef.current), "-=0.45")
        .to(".cc-card", { autoAlpha: 0, y: -10, duration: 0.45, delay: 1.25 })
        .to(".cc-back", { autoAlpha: 0, duration: 0.35 }, "<");

      return () => split.revert();
    },
    { scope: root, dependencies: [play] },
  );

  if (!mounted) return null;

  return createPortal(
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 z-[100] items-center justify-center"
      style={{ display: "none" }}
    >
      <div className="cc-back absolute inset-0 bg-[oklch(0.3_0.03_258/0.35)] backdrop-blur-sm" />
      <div className="cc-card relative flex flex-col items-center gap-3.5 px-8 py-10 text-center">
        <div ref={confettiRef} className="pointer-events-none absolute left-1/2 top-14 h-0 w-0" />
        <div className="cc-badge flex h-24 w-24 items-center justify-center rounded-full bg-success-soft">
          <svg viewBox="0 0 100 100" className="h-20 w-20">
            <circle className="cc-ring" cx="50" cy="50" r="42" fill="none" stroke="#1d9e75" strokeWidth="5" strokeLinecap="round" />
            <path className="cc-check" d="M30 51 L44 65 L71 35" fill="none" stroke="#1d9e75" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="cc-title text-2xl font-semibold tracking-tight text-white">¡Día cuadrado!</p>
        <p className="cc-sub text-[0.95rem] text-white/80">Cerraste perfecto. Buen trabajo.</p>
      </div>
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
