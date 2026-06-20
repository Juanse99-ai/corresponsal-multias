"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Logo } from "@/components/brand";
import { formatCOP } from "@/lib/format";

const STREAM = [
  { hora: "08:14", monto: 2000000 },
  { hora: "09:02", monto: 3500000 },
  { hora: "10:21", monto: 1800000 },
  { hora: "11:47", monto: 2200000 },
  { hora: "13:05", monto: 4000000 },
  { hora: "14:33", monto: 1500000 },
  { hora: "15:58", monto: 2716000 },
];

export function LoginHero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".lh-top", { y: 16, opacity: 0, duration: 0.7 })
        .from(".lh-line", { yPercent: 110, opacity: 0, duration: 0.85, stagger: 0.12 }, "-=0.25")
        .from(".lh-sub", { y: 16, opacity: 0, duration: 0.7 }, "-=0.45")
        .from(".lh-stream", { opacity: 0, x: 30, duration: 0.9 }, "-=0.5")
        .from(".lh-foot", { opacity: 0, duration: 0.6 }, "-=0.3");

      gsap.to(".lh-track", { yPercent: -50, duration: 20, ease: "none", repeat: -1 });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative flex h-full flex-col justify-between overflow-hidden p-10 xl:p-14">
      <div className="lh-top flex items-center gap-3">
        <Logo size={40} />
        <div className="leading-none">
          <p className="text-sm font-semibold text-nav-text">Barrio Centro Sabanalarga 18</p>
          <p className="text-[0.72rem] text-nav-faint">Multidiagnósticos AS</p>
        </div>
      </div>

      <div className="relative z-10 max-w-md xl:max-w-lg">
        <h1 className="text-[clamp(2.4rem,4.2vw,3.7rem)] font-semibold leading-[1.03] tracking-tight text-nav-text">
          <span className="block overflow-hidden">
            <span className="lh-line block">El cuadre del día,</span>
          </span>
          <span className="block overflow-hidden">
            <span className="lh-line block text-nav-accent">cuadrado.</span>
          </span>
        </h1>
        <p className="lh-sub mt-5 max-w-md text-[0.98rem] leading-relaxed text-nav-muted">
          Cupo de Luis, efectivo, Nequis y préstamos en un solo lugar. El compensado se arrastra
          solo y el saldo final se calcula en vivo.
        </p>
      </div>

      <div className="lh-stream pointer-events-none absolute right-6 top-0 hidden h-full w-60 xl:block">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-nav-bg via-transparent to-nav-bg" />
        <div className="absolute inset-0 flex flex-col px-2 pt-8">
          <div className="lh-track flex flex-col gap-3">
            {[...STREAM, ...STREAM].map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-[oklch(1_0_0/0.12)] bg-[oklch(1_0_0/0.06)] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-nav-accent" />
                  <span className="tnum text-[0.72rem] text-nav-faint">{s.hora}</span>
                </div>
                <span className="tnum text-[0.82rem] font-medium text-nav-text">{formatCOP(s.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lh-foot flex items-center gap-2 text-[0.72rem] text-nav-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Punto activo · NIT 901572225
      </div>
    </div>
  );
}
