// Freno de fechas para lo que el lector saca de las tirillas.
//
// El 10 nov 2026 el lector leyó "2020" en una tirilla de Bancolombia (el 6 se
// confunde con el 0 en el papel térmico). La consignación quedó guardada en
// 2020: no salía en ningún reporte, pero el arrastre del Sr. Luis sí la restaba
// (suma todo lo anterior a la fecha), y el día 10 arrancó $3.000.000 abajo.
//
// Regla: una tirilla se carga en el día que se está trabajando. Se acepta la
// fecha leída si queda a un día o menos (fotos de ayer subidas hoy, o el cambio
// de día cerca de la medianoche). Más lejos, o una fecha que no existe, no se
// confía: el movimiento queda en el día abierto y marcado para revisar.
//
// Lógica pura (sin Supabase ni React) para poder probarla sola.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Días desde 1970 de una fecha ISO real, o null si no lo es (2026-02-30, 10/11/2026...). */
function diaNumero(iso: string): number | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const f = new Date(t);
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) return null;
  return t / 86_400_000;
}

/** Máximo de días entre la fecha de la tirilla y el día que se está cargando. */
export const MARGEN_DIAS = 1;

/** True si las dos fechas existen y están a `MARGEN_DIAS` o menos. */
export function fechasCercanas(a: string, b: string): boolean {
  const na = diaNumero(a);
  const nb = diaNumero(b);
  return na !== null && nb !== null && Math.abs(na - nb) <= MARGEN_DIAS;
}

/**
 * Fecha con la que se guarda un comprobante leído.
 * - `fecha`: la de la tirilla si es creíble; si no, el día que se está cargando.
 * - `rara`: la fecha leída cuando no se le creyó (para mostrarla al revisar), o null.
 */
export function fechaDeTirilla(leida: string | null, dia: string): { fecha: string; rara: string | null } {
  if (!leida) return { fecha: dia, rara: null };
  if (fechasCercanas(leida, dia)) return { fecha: leida, rara: null };
  return { fecha: dia, rara: leida };
}
