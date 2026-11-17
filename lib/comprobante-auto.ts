// Decide qué pasa con un comprobante que llega solo (foto del grupo de WhatsApp
// del corresponsal, reenviada por el puente de OpenClaw): se guarda como
// consignación del Sr. Luis o queda para revisión en la app.
//
// Opción A (la eligió el dueño, 11 nov 2026): lo seguro se guarda solo; lo
// dudoso queda como foto pendiente en "Llenar desde fotos" del día, con aviso.
// Ante cualquier duda se revisa: aquí equivocarse es plata mal anotada.
//
// Lógica pura (sin Supabase ni React) para poder probarla sola.
import { fechaDeTirilla } from "./fecha-tirilla.ts";

/** Lo que devuelve el lector (lib/leer-comprobante.ts), solo los campos que usa la decisión. */
export interface LecturaTirilla {
  es_comprobante: boolean;
  monto: number | null;
  fecha: string | null;
  hora: string | null;
  transaccion: string | null;
  titular: string | null;
  /** Número de recibo de la tirilla: único por transacción. */
  recibo?: string | null;
  seguro: boolean;
}

export interface FilaConsignacion {
  fecha: string;
  monto: number;
  hora: string;
  nota: string | null;
}

export type Decision =
  | { accion: "guardar"; fila: FilaConsignacion }
  | { accion: "revisar"; motivo: string; fecha: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d/;

/** Lo que se guarda como nota: qué fue y para quién (igual que la carga desde fotos). */
export function notaDeLectura(l: Pick<LecturaTirilla, "transaccion" | "titular" | "recibo">): string | null {
  const recibo = soloDigitos(l.recibo);
  const partes = [l.transaccion, l.titular, recibo ? `recibo ${recibo}` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(", ").slice(0, 200) : null;
}

const soloDigitos = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");

/**
 * ¿Ya está registrada esta misma tirilla? (17 nov 2026, lo pidió el dueño:
 * dos consignaciones iguales en el mismo minuto no son la misma). Con número de
 * recibo se compara el recibo, que es único por transacción. Las consignaciones
 * guardadas antes de anotar el recibo (sin "recibo" en la nota), y las tirillas
 * sin recibo legible, se comparan como antes: mismo monto y misma hora.
 * @param iguales consignaciones del Sr. Luis del mismo día y el mismo monto
 */
export function yaRegistradaIgual(
  l: Pick<LecturaTirilla, "hora" | "recibo">,
  iguales: { hora: string | null; nota: string | null }[],
): boolean {
  const recibo = soloDigitos(l.recibo);
  const hora = (l.hora ?? "").slice(0, 5);
  const mismaHora = (r: { hora: string | null }) => !!hora && (r.hora ?? "").slice(0, 5) === hora;
  return iguales.some((r) => {
    const reciboGuardado = (r.nota ?? "").match(/recibo (\d+)/)?.[1];
    if (recibo && reciboGuardado) return reciboGuardado === recibo;
    return mismaHora(r);
  });
}

/**
 * @param l lectura de la tirilla
 * @param dia día del mensaje en Bogotá (YYYY-MM-DD)
 * @param opciones.diaCerrado el cuadre de ese día ya se cerró
 * @param opciones.yaRegistrada la misma tirilla ya está registrada (`yaRegistradaIgual`)
 */
export function decidirComprobante(
  l: LecturaTirilla,
  dia: string,
  opciones: { diaCerrado: boolean; yaRegistrada: boolean },
): Decision {
  const f = fechaDeTirilla(l.fecha, dia);

  if (!l.es_comprobante) return { accion: "revisar", motivo: "La foto no parece una tirilla", fecha: f.fecha };
  if (typeof l.monto !== "number" || !Number.isInteger(l.monto) || l.monto <= 0) {
    return { accion: "revisar", motivo: "No se leyó el monto", fecha: f.fecha };
  }
  if (!l.hora || !HORA.test(l.hora)) return { accion: "revisar", motivo: "No se leyó la hora", fecha: f.fecha };
  if (f.rara) return { accion: "revisar", motivo: `La tirilla dice ${f.rara}`, fecha: f.fecha };
  if (!l.seguro) return { accion: "revisar", motivo: "Un dígito quedó dudoso", fecha: f.fecha };
  if (opciones.diaCerrado) return { accion: "revisar", motivo: "El día ya está cerrado", fecha: f.fecha };
  // Puede ser la misma foto mandada dos veces o dos consignaciones iguales en el
  // mismo minuto: no se adivina, se revisa.
  if (opciones.yaRegistrada) return { accion: "revisar", motivo: "Ya hay una igual registrada", fecha: f.fecha };

  return {
    accion: "guardar",
    fila: { fecha: f.fecha, monto: l.monto, hora: l.hora.slice(0, 5), nota: notaDeLectura(l) },
  };
}
