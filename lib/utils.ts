import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
