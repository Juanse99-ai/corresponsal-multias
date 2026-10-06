import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// La escala propia de globals.css (@theme inline). Sin esto tailwind-merge
// toma `text-title` por un color y, junto a `text-muted`, lo borra.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["label", "meta", "body", "title", "lead", "h1", "kpi", "display"],
      radius: ["panel", "marco", "card"],
      shadow: ["pastilla", "riel-on", "primario", "chica", "flota", "ventana"],
      ease: ["ios"],
    },
  },
});

/** Une clases condicionales y resuelve conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * true si la tecla es Enter (sin composición IME), y evita el envío por defecto.
 * Para los <Input> de shadcn: onKeyDown={(e) => esEnter(e) && guardar()}.
 */
export function esEnter(e: { key: string; nativeEvent: { isComposing: boolean }; preventDefault: () => void }): boolean {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return false;
  e.preventDefault();
  return true;
}
