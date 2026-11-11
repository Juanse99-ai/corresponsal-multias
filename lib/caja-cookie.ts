/** Nombre de la cookie del equipo autorizado. Aparte de lib/caja.ts porque el
 *  middleware (proxy.ts) corre sin node:crypto. */
export const COOKIE_EQUIPO = "corr_equipo";

/** Números de la clave de caja (también en lib/caja.ts, que no se puede
 *  importar en el navegador por node:crypto). */
export const LARGO_CLAVE = 6;
