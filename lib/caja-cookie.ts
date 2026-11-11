// Constantes de la clave de caja que usan el proxy (sin node:crypto) y el
// navegador. El resto de las reglas está en lib/caja.ts.

/** Cookie httpOnly del equipo autorizado (token aleatorio). */
export const COOKIE_EQUIPO = "corr_equipo";
/** Cookie httpOnly con la hora del último uso en un equipo de caja. */
export const COOKIE_USO = "corr_caja_uso";
/** Minutos sin usar la app en la caja antes de volver a la pantalla de clave. */
export const MINUTOS_BLOQUEO = 10;
/** Números de la clave de caja. */
export const LARGO_CLAVE = 6;
