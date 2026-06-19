"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";

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
      const o = { v: prev.current };
      gsap.to(o, {
        v: saldo,
        duration: first.current ? 0 : 0.7,
        ease: "power2.out",
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = formatCOP(Math.round(o.v));
        },
      });
      prev.current = saldo;

      const target = descuadre ? LINEA : CHECK;
      if (first.current) {
        gsap.set(".sv-glyph", { morphSVG: target });
      } else {
        gsap.to(".sv-glyph", { morphSVG: target, duration: 0.5, ease: "power2.inOut" });
      }
      first.current = false;
    },
    { scope: root, dependencies: [saldo, descuadre] },
  );

  return (
    <div
      ref={root}
      className={cn(
        "flex items-center gap-3 transition-colors duration-500",
        descuadre ? "text-danger" : "text-success",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
          descuadre ? "bg-danger-soft" : "bg-success-soft",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6">
          <path
            className="sv-glyph"
            d={CHECK}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span ref={numRef} className="tnum text-4xl font-semibold tracking-tight">
        {formatCOP(saldo)}
      </span>
    </div>
  );
}
