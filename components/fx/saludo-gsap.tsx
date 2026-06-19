"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { Sun, CloudSun, MoonStars } from "@phosphor-icons/react/dist/ssr";
import { reduced } from "@/components/fx/reduced";

gsap.registerPlugin(SplitText);

/** Saludo del Panel con entrada animada (SplitText) e ícono según el momento del día. */
export function SaludoGsap({ saludo, nombre, mensaje }: { saludo: string; nombre: string; mensaje: string }) {
  const root = useRef<HTMLDivElement>(null);
  const Icono = saludo.includes("días") ? Sun : saludo.includes("tardes") ? CloudSun : MoonStars;

  useGSAP(
    () => {
      if (reduced()) return;
      const split = new SplitText(".sg-title", { type: "chars" });
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".sg-icon", { scale: 0, rotate: -60, autoAlpha: 0, duration: 0.5, ease: "power4.out" })
        .from(split.chars, { y: 20, autoAlpha: 0, stagger: 0.022, duration: 0.5 }, "-=0.2")
        .from(".sg-msg", { y: 12, autoAlpha: 0, duration: 0.6 }, "-=0.25");
      return () => split.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <div className="flex items-center gap-2.5">
        <span className="sg-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Icono size={19} weight="fill" />
        </span>
        <h1 className="sg-title text-2xl font-semibold tracking-tight text-text sm:text-[1.8rem]">
          {saludo}, {nombre}.
        </h1>
      </div>
      <p className="sg-msg mt-2.5 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted">{mensaje}</p>
    </div>
  );
}
