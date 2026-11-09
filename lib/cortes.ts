/**
 * Cortes de pantalla de Biela (21 oct 2026): tres anchos y nada más. Celular
 * hasta 600, tablet hasta 960 (ahí manda la barra de abajo) y computador desde
 * 961; 1200 separa el portátil del monitor. Son los mismos de Tailwind
 * (globals.css: sm 601, lg 961, xl 1200). test/cortes.test.ts falla si una
 * pantalla usa otro ancho.
 */
export const CELULAR = "(max-width: 600px)";
export const HASTA_TABLET = "(max-width: 960px)";
export const COMPUTADOR = "(min-width: 961px)";
