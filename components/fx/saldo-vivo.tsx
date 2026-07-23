"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import { reduced } from "@/components/fx/reduced";

gsap.registerPlugin(MorphSVGPlugin);

const LINEA = "M6 12 L18 12";
const CHECK = "M6 12.5 L10.5 16.5 L18 7.5";

/** Saldo que rueda hasta su valor y un glifo que morphea (línea descuadre <-> check cuadrado). */
export function SaldoVivo({ saldo, descuadre }: { saldo: number; descuadre: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(saldo);
  const first = useRef(true);

  useGSAP(
    () => {
      const rm = reduced();
      const o = { v: prev.current };
      gsap.to(o, {
        v: saldo,
        duration: first.current || rm ? 0 : 0.7,
        ease: "power2.out",
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = formatCOP(Math.round(o.v));
        },
      });
      prev.current = saldo;

      const target = descuadre ? LINEA : CHECK;
      if (first.current || rm) {
        gsap.set(".sv-glyph", { morphSVG: target });
      } else {
        // Morph del glifo + "pop" del badge para que el cambio de estado se note.
        gsap.to(".sv-glyph", { morphSVG: target, duration: 0.55, ease: "power2.inOut" });
        gsap.fromTo(".sv-badge", { scale: 1.3 }, { scale: 1, duration: 0.6, ease: "power4.out" });
      }
      first.current = false;
    },
    { scope: root, dependencies: [saldo, descuadre] },
  );

  return (
    <div
      ref={root}
      className={cn(
        "flex min-w-0 items-center gap-3 transition-colors duration-500",
        descuadre ? "text-danger" : "text-success",
      )}
    >
      <span
        className={cn(
          "sv-badge flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center rounded-full transition-colors duration-500",
          descuadre ? "bg-danger-soft" : "bg-success-soft",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7">
          <path
            className="sv-glyph"
            d={CHECK}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span ref={numRef} className="tnum min-w-0 flex-1 text-[1.75rem] leading-none font-semibold tracking-tight sm:text-4xl">
        {formatCOP(saldo)}
      </span>
    </div>
  );
}
