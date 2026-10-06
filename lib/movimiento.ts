/** Curva de iOS (guía 7) para framer-motion: la misma de --ease-ios en globals.css. */
export const CURVA_IOS = [0.32, 0.72, 0, 1] as const;

/** Entrar o salir, filas, plegables: 220 ms con la curva de iOS (--dur-2). */
export const TRANSICION = { duration: 0.22, ease: CURVA_IOS } as const;
