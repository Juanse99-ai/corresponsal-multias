"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { reduced } from "@/components/fx/reduced";
import { saludoHora, mensajePersonal } from "@/lib/saludos";

gsap.registerPlugin(MorphSVGPlugin);

// Flor de 6 pétalos de gota (como la referencia). Generada una vez.
function flor() {
  const petals = 6, cx = 50, cy = 50, len = 47, wide = 15;
  let d = `M${cx} ${cy}`;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    const ux = Math.cos(a), uy = Math.sin(a);
    const px = -uy, py = ux;
    const tx = cx + ux * len, ty = cy + uy * len;
    const b1x = cx + ux * len * 0.45 + px * wide, b1y = cy + uy * len * 0.45 + py * wide;
    const b2x = tx + px * wide, b2y = ty + py * wide;
    const b3x = tx - px * wide, b3y = ty - py * wide;
    const b4x = cx + ux * len * 0.45 - px * wide, b4y = cy + uy * len * 0.45 - py * wide;
    d += `C${b1x.toFixed(1)} ${b1y.toFixed(1)} ${b2x.toFixed(1)} ${b2y.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
    d += `C${b3x.toFixed(1)} ${b3y.toFixed(1)} ${b4x.toFixed(1)} ${b4y.toFixed(1)} ${cx} ${cy}`;
  }
  return d + "Z";
}

const FLOR = flor();
const CARRO =
  "M5 60 Q5 54 12 52 L24 49 Q30 38 40 36 L62 36 Q72 36 76 44 L86 50 Q95 52 95 59 L95 62 Q95 67 90 67 L82 67 A8 8 0 0 0 66 67 L38 67 A8 8 0 0 0 22 67 L10 67 Q5 67 5 62 Z";
const CORAZON =
  "M50 84 C18 60 8 40 8 27 C8 13 21 7 31 7 C40 7 47 12 50 19 C53 12 60 7 69 7 C79 7 92 13 92 27 C92 40 82 60 50 84Z";
const ESTRELLA = "M50 6 L62 38 L96 39 L69 60 L79 93 L50 73 L21 93 L31 60 L4 39 L38 38Z";
const SECUENCIA = [FLOR, CARRO, CORAZON, ESTRELLA];

// Cada forma: color, posición (%), tamaño (%), forma inicial (índice en SECUENCIA).
const PLACES: { c: string; x: number; y: number; w: number; s: number }[] = [
  { c: "#ff4fa3", x: 12, y: 14, w: 9, s: 0 },
  { c: "#4f9cf9", x: 32, y: 9, w: 11, s: 1 },
  { c: "#ffd21a", x: 84, y: 12, w: 9, s: 3 },
  { c: "#3ddc84", x: 90, y: 44, w: 9, s: 0 },
  { c: "#ff7a1a", x: 86, y: 80, w: 10, s: 1 },
  { c: "#b06cf0", x: 10, y: 50, w: 9, s: 2 },
  { c: "#ff4fa3", x: 14, y: 84, w: 8, s: 3 },
  { c: "#4f9cf9", x: 50, y: 91, w: 8, s: 2 },
  { c: "#ffd21a", x: 6, y: 40, w: 9, s: 0 },
];

/** Bienvenida a pantalla completa: app borrosa detrás, formas (flor/carro/corazón/estrella)
 *  que flotan y se MORPHEAN entre sí, secuencia de textos y el logo. Primeras 2 veces del día
 *  (o forzada con ?bienvenida=1). Solo se cierra al tocar. Respeta prefers-reduced-motion. */
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
      const key = `corr-bienvenida:v2:${hoy}`;
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
        gsap.set([".bv-logo", ".bv-greet", ".bv-msg", ".bv-hint"], { autoAlpha: 0, y: 0 });
        const t = gsap.timeline();
        t.fromTo(".bv-frost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
          .to([".bv-logo", ".bv-greet", ".bv-msg"], { autoAlpha: 1, duration: 0.4, stagger: 0.12 })
          .to(".bv-hint", { autoAlpha: 1, duration: 0.4 });
        tl.current = t;
        return;
      }

      // Estados iniciales.
      gsap.set(".bv-frost", { autoAlpha: 0 });
      gsap.set(".bv-shape", { scale: 0, autoAlpha: 0, y: 0, rotation: 0 });
      gsap.set(".bv-hero", { yPercent: -50, y: 40, autoAlpha: 0, scale: 0.85 });
      gsap.set([".bv-logo", ".bv-greet", ".bv-msg"], { autoAlpha: 0, y: 14 });
      gsap.set(".bv-hint", { autoAlpha: 0 });

      // Flotación perpetua de cada forma.
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

      // Morph continuo: cada forma va cambiando flor -> carro -> corazón -> estrella -> ...
      gsap.utils.toArray<SVGPathElement>(".bv-morph").forEach((path, i) => {
        const start = Number(path.dataset.s || "0");
        const m = gsap.timeline({ repeat: -1, delay: 1.2 + i * 0.22 });
        for (let k = 1; k <= 4; k++) {
          m.to(path, { morphSVG: SECUENCIA[(start + k) % 4], duration: 0.8, ease: "power2.inOut" }, "+=1.1");
        }
      });

      // La intro se reproduce y se QUEDA: solo se cierra cuando ella toca/presiona (saltar).
      const t = gsap.timeline();
      t.to(".bv-frost", { autoAlpha: 1, duration: 0.5, ease: "power2.out" })
        .to(".bv-shape", { scale: 1, autoAlpha: 1, duration: 0.65, ease: "back.out(1.8)", stagger: { each: 0.05, from: "random" } }, "-=0.2")
        .fromTo(".bv-hero", { y: 40, autoAlpha: 0, scale: 0.85 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, "-=0.15")
        .to(".bv-hero", { y: -42, autoAlpha: 0, scale: 0.92, duration: 0.5, ease: "power2.in" }, "+=0.9")
        .to(".bv-logo", { y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(2.2)" }, "-=0.1")
        .to(".bv-greet", { y: 0, autoAlpha: 1, duration: 0.5 }, "-=0.3")
        .to(".bv-msg", { y: 0, autoAlpha: 1, duration: 0.55 }, "-=0.25")
        .to(".bv-hint", { autoAlpha: 1, duration: 0.5 }, "-=0.1");
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
  const mensaje = mensajePersonal(nombre, fechaBogota);
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

      {PLACES.map((p, i) => (
        <div
          key={i}
          className="bv-shape pointer-events-none absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, transform: "translate(-50%,-50%)" }}
        >
          <svg viewBox="0 0 100 100" width="100%" style={{ display: "block" }}>
            <path className="bv-morph" data-s={p.s} d={SECUENCIA[p.s]} fill={p.c} />
          </svg>
        </div>
      ))}

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

      <p className="bv-hint pointer-events-none absolute bottom-9 left-0 right-0 z-10 text-center text-[0.82rem] text-white/55">
        toca para continuar
      </p>
    </div>,
    document.body,
  );
}
