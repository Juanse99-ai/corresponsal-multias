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
export function notaDeLectura(l: Pick<LecturaTirilla, "transaccion" | "titular">): string | null {
  const partes = [l.transaccion, l.titular].filter(Boolean);
  return partes.length > 0 ? partes.join(", ").slice(0, 200) : null;
}

/**
 * @param l lectura de la tirilla
 * @param dia día del mensaje en Bogotá (YYYY-MM-DD)
 * @param opciones.diaCerrado el cuadre de ese día ya se cerró
 * @param opciones.yaRegistrada hay una consignación del Sr. Luis con el mismo día, monto y hora
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
