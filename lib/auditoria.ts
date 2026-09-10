/**
 * Revisiones automáticas de la cuenta de Sr. Luis.
 *
 * Cada una salió de un error real encontrado cuadrando agosto de 2026:
 *  - un registro de $9.481.000 cuando el datáfono topa en $3.000.000
 *  - la misma consignación apuntada el 27 y el 28 de agosto
 *  - 23 días con movimientos y sin cuadre hecho
 *
 * Son funciones puras: reciben datos y devuelven hallazgos. No tocan nada.
 */

/** Tope del datáfono por consignación. Por encima, el monto va partido. */
export const TOPE_CONSIGNACION = 3_000_000;
/** Tope por transferencia que manda Sr. Luis. */
export const TOPE_COMPENSACION = 9_999_999;

export interface MovAuditable {
  id: string;
  fecha: string;
  hora: string | null;
  monto: number;
}

export type TipoHallazgo = "tope" | "duplicado-dia" | "duplicado-dias" | "sin-cuadre";

export interface Hallazgo {
  tipo: TipoHallazgo;
  /** Día al que hay que ir para revisarlo. */
  fecha: string;
  titulo: string;
  detalle: string;
  monto: number | null;
  /** alta = casi seguro es un error; media = vale la pena mirarlo. */
  gravedad: "alta" | "media";
}

const hhmm = (h: string | null) => (h ?? "").slice(0, 5);

/** Consignaciones por encima del tope del datáfono: casi siempre un total mal apuntado. */
export function buscarSobreTope(movs: MovAuditable[]): Hallazgo[] {
  return movs
    .filter((m) => m.monto > TOPE_CONSIGNACION)
    .map((m) => ({
      tipo: "tope" as const,
      fecha: m.fecha,
      titulo: "Consignación por encima del tope",
      detalle: `El datáfono no deja pasar de $3.000.000 por consignación, así que este monto debería estar partido en varias.`,
      monto: m.monto,
      gravedad: "alta" as const,
    }));
}

/**
 * Mismo monto y misma hora repetidos. Dentro del día suele ser un doble guardado;
 * entre días seguidos es el caso del 27/28 de agosto, donde se apuntó primero con
 * la fecha equivocada y después con la correcta.
 */
export function buscarDuplicados(movs: MovAuditable[]): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const clave = (m: MovAuditable) => `${m.fecha}|${m.monto}|${hhmm(m.hora)}`;

  const porClave = new Map<string, MovAuditable[]>();
  for (const m of movs) {
    if (!m.hora) continue; // sin hora no se puede afirmar nada
    const k = clave(m);
    porClave.set(k, [...(porClave.get(k) ?? []), m]);
  }

  // Nota: varias transferencias iguales en el mismo minuto son normales cuando
  // se parte un monto grande, así que esto queda en gravedad media.
  for (const [, grupo] of porClave) {
    if (grupo.length < 2) continue;
    const m = grupo[0];
    hallazgos.push({
      tipo: "duplicado-dia",
      fecha: m.fecha,
      titulo: `${grupo.length} registros idénticos`,
      detalle: `Mismo monto y misma hora (${hhmm(m.hora)}) ${grupo.length} veces. Puede ser correcto si se partió un monto grande, o un doble guardado.`,
      monto: m.monto,
      gravedad: "media",
    });
  }

  // Mismo monto y hora en días consecutivos: eso sí no tiene explicación buena.
  const diaSiguiente = (f: string) => {
    const d = new Date(`${f}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const existe = new Set(movs.filter((m) => m.hora).map(clave));
  const vistos = new Set<string>();
  for (const m of movs) {
    if (!m.hora) continue;
    const k = `${diaSiguiente(m.fecha)}|${m.monto}|${hhmm(m.hora)}`;
    if (!existe.has(k) || vistos.has(k)) continue;
    vistos.add(k);
    hallazgos.push({
      tipo: "duplicado-dias",
      fecha: m.fecha,
      titulo: "Misma consignación en dos días seguidos",
      detalle: `El mismo monto a la misma hora (${hhmm(m.hora)}) aparece el ${m.fecha} y el ${diaSiguiente(m.fecha)}. Suele ser la misma, apuntada primero con la fecha equivocada.`,
      monto: m.monto,
      gravedad: "alta",
    });
  }

  return hallazgos;
}

/** Días con movimientos de Luis pero sin cuadre hecho. */
export function buscarDiasSinCuadre(conMovimientos: string[], conCuadre: string[]): Hallazgo[] {
  const cuadrados = new Set(conCuadre);
  return [...new Set(conMovimientos)]
    .filter((f) => !cuadrados.has(f))
    .sort()
    .map((fecha) => ({
      tipo: "sin-cuadre" as const,
      fecha,
      titulo: "Día sin cuadre",
      detalle: "Hubo movimientos de Sr. Luis pero el cuadre diario nunca se hizo.",
      monto: null,
      gravedad: "media" as const,
    }));
}

/** Ordena los hallazgos: lo más grave y lo más reciente primero. */
export function ordenarHallazgos(hs: Hallazgo[]): Hallazgo[] {
  return [...hs].sort((a, b) => {
    if (a.gravedad !== b.gravedad) return a.gravedad === "alta" ? -1 : 1;
    return b.fecha.localeCompare(a.fecha);
  });
}
