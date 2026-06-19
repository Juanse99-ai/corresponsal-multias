/** true si el usuario pidió reducir el movimiento (accesibilidad). */
export function reduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
