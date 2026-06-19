"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { reduced } from "@/components/fx/reduced";
import { saludoHora, mensajeDelDia } from "@/lib/saludos";

gsap.registerPlugin(MorphSVGPlugin);

const CIRCLE_PATH = "M50 8 C73.2 8 92 26.8 92 50 C92 73.2 73.2 92 50 92 C26.8 92 8 73.2 8 50 C8 26.8 26.8 8 50 8Z";
const SPARKLE_PATH = "M50 6 C54 38 62 46 94 50 C62 54 54 62 50 94 C46 62 38 54 6 50 C38 46 46 38 50 6Z";
const STAR5 = "M50 5 L61 38 L96 38 L68 59 L79 92 L50 71 L21 92 L32 59 L4 38 L39 38Z";

const FORMAS: { t: string; c: string; x: number; y: number; w: number; r?: number }[] = [
  { t: "circle", c: "#4f9cf9", x: 11, y: 14, w: 6 },
  { t: "smile", c: "#ff7a1a", x: 30, y: 9, w: 11 },
  { t: "heart", c: "#ff4fa3", x: 84, y: 12, w: 8 },
  { t: "tri", c: "#3ddc84", x: 90, y: 42, w: 8 },
  { t: "star", c: "#ffd21a", x: 86, y: 80, w: 8 },
  { t: "blob", c: "#b06cf0", x: 9, y: 50, w: 7 },
  { t: "rect", c: "#b06cf0", x: 13, y: 84, w: 9 },
  { t: "sparkle", c: "#ffffff", x: 26, y: 76, w: 5 },
  { t: "circle", c: "#ff7a1a", x: 50, y: 92, w: 5 },
  { t: "smile", c: "#ffd21a", x: 5, y: 40, w: 9, r: 150 },
];

function FormaSVG({ t, c }: { t: string; c: string }) {
  const inner: Record<string, React.ReactNode> = {
    circle: <circle cx="50" cy="50" r="44" fill={c} />,
    smile: <path d="M14 42 A38 38 0 0 0 86 42" fill="none" stroke={c} strokeWidth="22" strokeLinecap="round" />,
    heart: (
      <path d="M50 84 C18 60 8 40 8 27 C8 13 21 7 31 7 C40 7 47 12 50 19 C53 12 60 7 69 7 C79 7 92 13 92 27 C92 40 82 60 50 84Z" fill={c} />
    ),
    tri: <path d="M50 12 L86 82 L14 82 Z" fill={c} stroke={c} strokeWidth="12" strokeLinejoin="round" />,
    sparkle: <path d={SPARKLE_PATH} fill={c} />,
    rect: <rect x="8" y="22" width="84" height="56" rx="18" fill={c} />,
    blob: <path d="M52 8 C72 6 92 22 92 44 C92 66 76 94 50 92 C26 90 8 72 10 48 C12 26 32 10 52 8Z" fill={c} />,
    star: <path d={STAR5} fill={c} />,
  };
  return (
    <svg viewBox="0 0 100 100" width="100%" style={{ display: "block" }}>
      {inner[t]}
    </svg>
  );
}

/** Bienvenida a pantalla completa: app borrosa detrás, formas de colores que flotan,
 *  una que morphea, secuencia de textos kinéticos y el logo. Primeras 2 veces del día
 *  (o forzada con ?bienvenida=1). Respeta prefers-reduced-motion. */
export function BienvenidaSplash({ nombre }: { nombre: string }) {
  const [show, setShow] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("bienvenida") === "1") {
        setShow(true);
        return;
      }
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
      gsap.set(root.current, { autoAlpha: 1 });

      if (reduced()) {
        gsap.set(".bv-hero", { autoAlpha: 0 });
        gsap.set(".bv-shape", { autoAlpha: 1, scale: 1 });
        gsap.set([".bv-logo", ".bv-greet", ".bv-msg"], { autoAlpha: 0, y: 0 });
        const t = gsap.timeline({ onComplete: () => setShow(false) });
        t.fromTo(".bv-frost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
          .to([".bv-logo", ".bv-greet", ".bv-msg"], { autoAlpha: 1, duration: 0.4, stagger: 0.12 })
          .to({}, { duration: 1.6 })
          .to(".bv-frost", { autoAlpha: 0, duration: 0.4 });
        tl.current = t;
        return;
      }

      // Estados iniciales.
      gsap.set(".bv-frost", { autoAlpha: 0 });
      gsap.set(".bv-shape", { scale: 0, autoAlpha: 0, y: 0, rotation: 0 });
      gsap.set(".bv-hero", { yPercent: -50, y: 40, autoAlpha: 0, scale: 0.85 });
      gsap.set([".bv-logo", ".bv-greet", ".bv-msg"], { autoAlpha: 0, y: 14 });

      // Flotación perpetua + morph (independientes de la secuencia).
      gsap.utils.toArray<HTMLElement>(".bv-shape").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 ? 16 : -16,
          rotation: i % 2 ? 10 : -10,
          duration: 1.5 + (i % 5) * 0.28,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 0.6,
        });
      });
      gsap.to(".bv-morph", {
        morphSVG: SPARKLE_PATH,
        duration: 0.7,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 1,
        delay: 1.1,
      });

      const t = gsap.timeline({ onComplete: () => setShow(false) });
      t.to(".bv-frost", { autoAlpha: 1, duration: 0.5, ease: "power2.out" })
        .to(".bv-shape", { scale: 1, autoAlpha: 1, duration: 0.65, ease: "back.out(1.8)", stagger: { each: 0.05, from: "random" } }, "-=0.2")
        .fromTo(".bv-hero", { y: 40, autoAlpha: 0, scale: 0.85 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, "-=0.15")
        .to(".bv-hero", { y: -42, autoAlpha: 0, scale: 0.92, duration: 0.5, ease: "power2.in" }, "+=0.9")
        .to(".bv-logo", { y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(2.2)" }, "-=0.1")
        .to(".bv-greet", { y: 0, autoAlpha: 1, duration: 0.5 }, "-=0.3")
        .to(".bv-msg", { y: 0, autoAlpha: 1, duration: 0.55 }, "-=0.25")
        .to({}, { duration: 1.5 })
        .to(".bv-shape", { scale: 0, autoAlpha: 0, duration: 0.45, ease: "power2.in", stagger: 0.025 })
        .to(".bv-center", { autoAlpha: 0, y: -12, duration: 0.45, ease: "power2.in" }, "-=0.4")
        .to(".bv-frost", { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, "-=0.2");
      tl.current = t;
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
  const bienvenida = /a$/i.test(primer) ? "¡Bienvenida!" : "¡Bienvenido!";

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
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden outline-none"
      style={{ opacity: 0 }}
    >
      <div
        className="bv-frost absolute inset-0"
        style={{
          backgroundColor: "oklch(0.16 0.02 265 / 0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      />

      {FORMAS.map((f, i) => (
        <div
          key={i}
          className="bv-shape pointer-events-none absolute"
          style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, transform: "translate(-50%,-50%)" }}
        >
          <div style={{ transform: `rotate(${f.r ?? 0}deg)` }}>
            <FormaSVG t={f.t} c={f.c} />
          </div>
        </div>
      ))}

      <div
        className="bv-shape pointer-events-none absolute"
        style={{ left: "78%", top: "24%", width: "7%", transform: "translate(-50%,-50%)" }}
      >
        <svg viewBox="0 0 100 100" width="100%" style={{ display: "block" }}>
          <path className="bv-morph" d={CIRCLE_PATH} fill="#b06cf0" />
        </svg>
      </div>

      <p className="bv-hero pointer-events-none absolute left-0 right-0 top-1/2 z-10 px-6 text-center text-[2.6rem] font-extrabold tracking-tight text-white sm:text-6xl">
        {bienvenida}
      </p>

      <div className="bv-center relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <div className="bv-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-multias.jpg"
            alt="Multidiagnósticos AS"
            style={{ height: 52, width: "auto", borderRadius: 12, display: "block" }}
          />
        </div>
        <p className="bv-greet text-lg font-medium text-white/80 sm:text-xl">
          {saludo}, {primer}
        </p>
        <p className="bv-msg max-w-[22ch] text-[1.6rem] font-semibold leading-snug tracking-tight text-white sm:text-[2.1rem]">
          {mensaje}
        </p>
      </div>
    </div>,
    document.body,
  );
}
