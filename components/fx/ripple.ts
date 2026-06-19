import type { MouseEvent } from "react";
import gsap from "gsap";

/** Efecto ripple (onda) desde el punto del clic. El elemento debe ser relative + overflow-hidden. */
export function ripple(e: MouseEvent<HTMLElement>, color = "rgba(199,162,82,0.4)") {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.1;
  const span = document.createElement("span");
  span.style.cssText = `position:absolute;left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:50%;background:${color};pointer-events:none;`;
  el.appendChild(span);
  gsap.fromTo(
    span,
    { scale: 0, opacity: 0.65 },
    { scale: 1, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => span.remove() },
  );
}
