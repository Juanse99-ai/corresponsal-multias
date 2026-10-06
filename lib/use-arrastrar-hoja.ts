import { useCallback, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";

const UMBRAL_PX = 110;
const UMBRAL_VEL = 0.6; // px/ms
const ARRANQUE_PX = 8;
const AGARRE_PX = 44;
// Sobre lo que se toca para otra cosa no arranca el arrastre.
const NO_ARRASTRA = "input,textarea,select,button,a,label,[role=slider],[role=switch],[contenteditable=true],canvas";
const CABECERA = "[data-slot=dialog-header],[data-slot=alert-dialog-header],[data-slot=sheet-header]";

/**
 * Arrastrar una hoja del celular hacia abajo para cerrarla (guía 8.13). Se
 * agarra por la agarradera o la cabecera (los primeros 44 px), o por el cuerpo
 * si está arriba del todo y se tira hacia abajo. Arranca a los 8 px y la hoja
 * sigue al dedo. Al soltar, si bajó más de 110 px (o más de 40 a más de
 * 0,6 px/ms) se cierra mandando Escape: si la ventana pregunta antes de
 * cerrarse, pregunta. Si no, vuelve a su sitio en 260 ms.
 *
 * Con el dedo se usan eventos táctiles: el `touchmove` se cancela para que la
 * página no se desplace (con eventos de puntero el navegador se queda el gesto
 * y los corta). Con reducir movimiento no arranca: la hoja se cierra con la ×,
 * Cancelar o tocando afuera.
 *
 * `siempre`: la hoja de la barra de abajo, que es hoja en todo ancho. Las
 * ventanas lo son solo en el celular (< 640 px).
 */
export function useArrastrarHoja({ siempre = false }: { siempre?: boolean } = {}) {
  const empezar = useCallback(
    (hoja: HTMLElement, destino: EventTarget | null, y0: number, conDedo: boolean) => {
      const esHoja = siempre || window.matchMedia("(max-width: 639px)").matches;
      if (!esHoja || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (destino instanceof Element && destino.closest(NO_ARRASTRA)) return;
      const enAgarre =
        y0 - hoja.getBoundingClientRect().top < AGARRE_PX || (destino instanceof Element && !!destino.closest(CABECERA));
      if (!enAgarre && hoja.scrollTop > 0) return;

      const t0 = performance.now();
      let dy = 0;
      let activo = false;

      const mover = (y: number, ev: Event) => {
        dy = Math.max(0, y - y0);
        if (!activo && dy > ARRANQUE_PX) {
          // En el cuerpo, un arrastre hacia abajo con el scroll arriba es para
          // cerrar; si no, se deja al scroll.
          activo = enAgarre || hoja.scrollTop <= 0;
          if (!activo) return soltar();
          hoja.style.transition = "none";
          hoja.style.userSelect = "none";
          window.getSelection?.()?.removeAllRanges();
        }
        // En la agarradera y la cabecera, el dedo nunca desplaza la página.
        if ((activo || enAgarre) && ev.cancelable) ev.preventDefault();
        if (activo) hoja.style.transform = `translateY(${dy}px)`;
      };
      const alMoverDedo = (ev: TouchEvent) => mover(ev.touches[0]?.clientY ?? y0, ev);
      const alMoverPuntero = (ev: PointerEvent) => mover(ev.clientY, ev);

      const soltar = () => {
        window.removeEventListener("touchmove", alMoverDedo);
        window.removeEventListener("touchend", soltar);
        window.removeEventListener("touchcancel", soltar);
        window.removeEventListener("pointermove", alMoverPuntero);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
        if (!activo) return;
        hoja.style.userSelect = "";
        const vel = dy / Math.max(1, performance.now() - t0);
        const volver = () => {
          delete hoja.dataset.arrastrada;
          hoja.style.transition = "transform 260ms var(--ease-ios)";
          hoja.style.transform = "";
        };
        if (dy > UMBRAL_PX || (dy > 40 && vel > UMBRAL_VEL)) {
          // Escape pasa por la misma puerta que la ×. La hoja baja desde donde
          // quedó (la salida anima transform sin "from"; data-arrastrada elige
          // la salida hacia abajo); si no se cerró, vuelve.
          hoja.dataset.arrastrada = "";
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
          setTimeout(() => {
            if (hoja.isConnected && hoja.dataset.state !== "closed") volver();
          }, 60);
        } else {
          volver();
        }
      };

      if (conDedo) {
        window.addEventListener("touchmove", alMoverDedo, { passive: false });
        window.addEventListener("touchend", soltar);
        window.addEventListener("touchcancel", soltar);
      } else {
        window.addEventListener("pointermove", alMoverPuntero);
        window.addEventListener("pointerup", soltar);
        window.addEventListener("pointercancel", soltar);
      }
    },
    [siempre],
  );

  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) return;
      empezar(e.currentTarget, e.target, e.touches[0].clientY, true);
    },
    [empezar],
  );

  // El mouse (y el lápiz) van por eventos de puntero; el dedo, por los táctiles.
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "touch" || e.button > 0) return;
      empezar(e.currentTarget, e.target, e.clientY, false);
    },
    [empezar],
  );

  return { onTouchStart, onPointerDown };
}
