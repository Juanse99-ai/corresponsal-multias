import { useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { COLOR_BARRA_SISTEMA } from "@/lib/colores-tema";

type Tema = keyof typeof COLOR_BARRA_SISTEMA;

/**
 * Cambia el tema con un fundido de 350 ms de toda la página (guía 8.28,
 * `::view-transition-*` en globals.css). Solo si el tema de verdad cambia, si
 * el navegador sabe hacerlo y sin "reducir movimiento"; si no, de golpe.
 * next-themes pone la clase en <html> en un efecto: la transición espera a que
 * cambie para tomar la foto de la página nueva.
 */
export function useCambiarTema() {
  const { resolvedTheme, setTheme } = useTheme();
  return useCallback(
    (nuevo: Tema) => {
      if (resolvedTheme === nuevo) return;
      const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducir || typeof document.startViewTransition !== "function") {
        setTheme(nuevo);
        return;
      }
      const html = document.documentElement;
      const listo = () => html.classList.contains("dark") === (nuevo === "dark");
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const fin = () => {
              obs.disconnect();
              clearTimeout(tope);
              resolve();
            };
            const obs = new MutationObserver(() => listo() && fin());
            obs.observe(html, { attributes: true, attributeFilter: ["class"] });
            // Si por algo la clase no cambia, la transición no se queda colgada.
            const tope = setTimeout(fin, 300);
            setTheme(nuevo);
          }),
      );
    },
    [resolvedTheme, setTheme],
  );
}

/** La barra del sistema (y la de la app instalada) sigue al tema elegido, no al del teléfono. */
export function useColorBarraSistema() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const color = COLOR_BARRA_SISTEMA[resolvedTheme];
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
  }, [resolvedTheme]);
}
