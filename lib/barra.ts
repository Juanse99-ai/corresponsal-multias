// Cuentas de la barra de abajo del celular (components/shell/barra-abajo.tsx),
// sin React, como las del taller.

/** En qué botón cae el dedo: `n` botones iguales en `ancho` desde `izq`. Fuera
 *  de la barra se queda en el primero o el último. */
export function indiceEnBarra(x: number, izq: number, ancho: number, n: number): number {
  if (!n || ancho <= 0) return 0;
  const i = Math.floor(((x - izq) / ancho) * n);
  return Math.min(n - 1, Math.max(0, i));
}

/** Un toque pasa a ser arrastre con más de 6 px de lado. */
export const esArrastre = (dx: number, umbral = 6) => Math.abs(dx) > umbral;

/**
 * La barra se encoge al bajar y vuelve al subir (Instagram en iOS 26). Se
 * mira el scroll acumulado en una misma dirección para que un temblor del
 * dedo no la haga parpadear; arriba del todo va siempre normal.
 * Devuelve `chica` (true, false o null si no cambia) y lo acumulado.
 */
export function decidirChica({
  y,
  dy,
  acum = 0,
  umbral = 8,
  arriba = 40,
}: {
  y: number;
  dy: number;
  acum?: number;
  umbral?: number;
  arriba?: number;
}): { chica: boolean | null; acum: number } {
  if (y <= arriba) return { chica: false, acum: 0 };
  if (!dy) return { chica: null, acum };
  const seguido = Math.sign(dy) === Math.sign(acum) ? acum + dy : dy;
  if (seguido >= umbral) return { chica: true, acum: seguido };
  if (seguido <= -umbral) return { chica: false, acum: seguido };
  return { chica: null, acum: seguido };
}
