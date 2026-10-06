import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ABIERTAS = ["dialog-content", "alert-dialog-content", "sheet-content"]
  .map((s) => `[data-slot="${s}"][data-state="open"]`)
  .join(",");
/** Cuántas ventanas u hojas hay abiertas (los gestos no arrancan con una encima). */
export const contarAbiertas = () => document.querySelectorAll(ABIERTAS).length;

type Marca = { mda?: "ventana" | "muerta" };
const marcaDe = (estado: unknown): Marca["mda"] => (estado as Marca | null)?.mda;

/**
 * Atrás (el botón o el gesto del teléfono) cierra la ventana u hoja de arriba
 * en vez de salirse de la pantalla (guía 8.22).
 *
 * - Cada ventana que se abre deja una entrada en el historial ({ mda: "ventana" }).
 *   Next 16 parcha history.pushState y copia su estado interno (__NA y el árbol)
 *   en la entrada nueva; al volver restaura la misma ruta con el caché de ahora
 *   (node_modules/next/dist/client/components/app-router.js).
 * - Atrás con una ventana abierta la cierra mandando Escape (la misma puerta
 *   que la ×). Si no se deja cerrar (está guardando), su entrada vuelve.
 * - Si se cierra con su botón, su entrada queda (no se puede borrar sin
 *   navegar) y se marca muerta: el atrás que la deja, o que cae en ella, sigue
 *   de largo hasta la pantalla anterior, así ningún atrás se queda sin hacer nada.
 */
export function useAtrasCierraVentanas() {
  const pathname = usePathname();
  // La entrada en la que estamos es de una ventana que ya se cerró.
  const enMuerta = useRef(false);

  useEffect(() => {
    enMuerta.current = !!marcaDe(history.state) && contarAbiertas() === 0;
  }, [pathname]);

  useEffect(() => {
    let cuenta = contarAbiertas();
    let porAtras = 0; // cierres pedidos por atrás que aún no llegan

    const marcarMuerta = () => {
      if (marcaDe(history.state) === "ventana") history.replaceState({ ...history.state, mda: "muerta" }, "");
      enMuerta.current = !!marcaDe(history.state);
    };
    // Al recargar sobre la entrada de una ventana, la ventana ya no está.
    if (cuenta === 0) marcarMuerta();

    const revisar = () => {
      const n = contarAbiertas();
      if (n > cuenta) {
        for (let i = cuenta; i < n; i++) history.pushState({ mda: "ventana" }, "");
        enMuerta.current = false;
      } else if (n < cuenta) {
        const pedidas = Math.min(porAtras, cuenta - n);
        porAtras -= pedidas;
        if (cuenta - n > pedidas) marcarMuerta();
      }
      cuenta = n;
    };

    // Las ventanas se montan en un portal: se mira el body, una vez por cuadro.
    let cuadro = 0;
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(revisar);
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });

    // Un history.back() propio está en camino: su popstate no vuelve a saltar
    // por haber salido de una entrada muerta (ya se contó el atrás del usuario).
    let saltando = false;
    let finSalto = 0;
    const saltar = () => {
      saltando = true;
      clearTimeout(finSalto);
      // Si no había a dónde volver, no llega ningún popstate.
      finSalto = window.setTimeout(() => (saltando = false), 400);
      history.back();
    };

    const alVolver = (e: PopStateEvent) => {
      const n = contarAbiertas();
      if (n > 0) {
        porAtras++;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        setTimeout(() => {
          if (contarAbiertas() >= n) {
            porAtras = Math.max(0, porAtras - 1);
            history.pushState({ mda: "ventana" }, "");
          }
        }, 120);
        return;
      }
      const marca = marcaDe(e.state);
      // Cayó en una entrada de ventana que ya no está, o el usuario salió de
      // una: el atrás era para la pantalla anterior.
      const debeSaltar = !!marca || (!saltando && enMuerta.current);
      saltando = false;
      enMuerta.current = !!marca;
      if (debeSaltar) saltar();
    };
    window.addEventListener("popstate", alVolver);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(cuadro);
      clearTimeout(finSalto);
      window.removeEventListener("popstate", alVolver);
    };
  }, []);
}
