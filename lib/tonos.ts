/**
 * Íconos con su color (Biela, 8 nov 2026, opción B que eligió el dueño: «como
 * Apple Wallet»). Cada tipo de plata lleva su color suave en el cuadro del
 * ícono; las cifras siguen en tinta. Los tonos salen de los pares de
 * globals.css, que tienen su versión de Noche:
 *   ok      verde: lo que entra, el efectivo
 *   bad     rojo: lo que sale (retiros, egresos)
 *   warn    ámbar: préstamos y compensado
 *   info    azul: Bancolombia, Nequi, transferencias, recaudos
 *   purple  morado: la cuenta del Sr. Luis y la tirilla
 * Esto afloja la regla de verde y rojo solo para estado: en el cuadro del
 * ícono dicen de qué tipo es la plata, no si cuadró.
 */
export type Tono = "ok" | "bad" | "warn" | "info" | "purple";

/** Tono de cada concepto del corresponsal. */
export const TONO: Record<string, Tono> = {
  efectivo: "ok",
  consignacion: "ok",
  retiro: "bad",
  egreso: "bad",
  prestamo: "warn",
  abono: "ok",
  compensado: "warn",
  nequi: "info",
  bancolombia: "info",
  transferencia: "info",
  recaudo: "info",
  luis: "purple",
  tirilla: "purple",
};

/** El cuadro del ícono: tinta y fondo del tono (gris sin tono). */
export const fondoTono = (t?: Tono) =>
  t
    ? {
        ok: "bg-ok-bg text-ok-fg",
        bad: "bg-bad-bg text-bad-fg",
        warn: "bg-warn-bg text-warn-fg",
        info: "bg-info-bg text-info-fg",
        purple: "bg-purple-bg text-purple-fg",
      }[t]
    : "bg-surface-2 text-text-2";

/** Solo la tinta, para un ícono suelto (sin cuadro). */
export const tintaTono = (t?: Tono) =>
  t
    ? { ok: "text-ok-fg", bad: "text-bad-fg", warn: "text-warn-fg", info: "text-info-fg", purple: "text-purple-fg" }[t]
    : "text-muted";
