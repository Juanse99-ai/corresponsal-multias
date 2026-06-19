import type { MouseEvent } from "react";
import gsap from "gsap";
import { reduced } from "@/components/fx/reduced";

/** Onda (ripple) desde el punto del clic, en el color de acento. Elemento relative + overflow-hidden. */
export function ripple(e: MouseEvent<HTMLElement>) {
  if (reduced()) return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.1;
  const span = document.createElement("span");
  span.style.cssText = `position:absolute;left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:50%;background:var(--accent);pointer-events:none;`;
  el.appendChild(span);
  gsap.fromTo(
    span,
    { scale: 0, opacity: 0.32 },
    { scale: 1, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => span.remove() },
  );
}
