/** Id del telón de entrada de la app (components/fx/entrada.tsx). */
export const ENTRADA_ID = "entrada";

/** ¿Sigue la entrada de la app en pantalla? Solo en el navegador. */
export function entradaEnPantalla(): boolean {
  const el = document.getElementById(ENTRADA_ID);
  return !!el?.getAnimations?.().some((a) => a.playState !== "finished");
}

/** Se cumple cuando termina la entrada, o de una si no está en pantalla. */
export function finDeEntrada(): Promise<void> {
  const animaciones = document.getElementById(ENTRADA_ID)?.getAnimations?.() ?? [];
  if (!animaciones.length) return Promise.resolve();
  return Promise.race([
    Promise.allSettled(animaciones.map((a) => a.finished)).then(() => undefined),
    // Por si el navegador nunca avisa: la entrada dura poco más de un segundo.
    new Promise<void>((listo) => setTimeout(listo, 2000)),
  ]);
}
