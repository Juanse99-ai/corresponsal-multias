/**
 * Paso de la pantalla de entrar a la app (alternativa B, 11 nov 2026): el Panel
 * entra desde la derecha y empuja la de entrar, que se corre un tercio y se
 * oscurece, como el cambio de pantalla de iOS. 420 ms con la curva de iOS.
 *
 * Va con View Transitions (`html.paso-entrar::view-transition-*` en
 * globals.css): el navegador toma la foto de la pantalla de entrar, se navega y,
 * cuando la app ya pintó (`pasoLlego()` desde el AppShell), anima la foto vieja
 * contra la pantalla nueva. Sin soporte o con "reducir movimiento", se navega de
 * golpe. Si la app tarda más de 3 s, se salta la animación y se navega igual.
 *
 * Las variables de módulo sirven entre las dos pantallas porque el formulario y
 * el AppShell corren en el mismo navegador, sin recargar.
 */

let avisar: (() => void) | null = null;
let paso: ViewTransition | null = null;

/** Navega con el paso: `ir` es la navegación (router.replace). */
export function entrarConPaso(ir: () => void): void {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducir || typeof document.startViewTransition !== "function") {
    ir();
    return;
  }
  const html = document.documentElement;
  html.classList.add("paso-entrar");
  const t = document.startViewTransition(
    () =>
      new Promise<void>((resolve, reject) => {
        const tope = setTimeout(() => {
          avisar = null;
          reject(new Error("La app tardó en pintar: sin paso."));
        }, 3000);
        avisar = () => {
          clearTimeout(tope);
          avisar = null;
          resolve();
        };
        ir();
      }),
  );
  paso = t;
  // Saltada o terminada, se limpia igual; los rechazos no son errores.
  t.ready.catch(() => {});
  t.updateCallbackDone.catch(() => {});
  t.finished
    .catch(() => {})
    .finally(() => {
      html.classList.remove("paso-entrar");
      if (paso === t) paso = null;
    });
}

/** La app ya pintó: el navegador puede tomar la foto nueva y animar. */
export function pasoLlego(): void {
  avisar?.();
}

/** ¿Está el paso en pantalla? */
export function pasoEnCurso(): boolean {
  return paso !== null;
}

/** Se cumple cuando termina el paso, o de una si no hay. */
export function finDelPaso(): Promise<void> {
  return paso ? paso.finished.then(
    () => undefined,
    () => undefined,
  ) : Promise.resolve();
}
