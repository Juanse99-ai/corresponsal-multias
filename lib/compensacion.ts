// Compensaciones del Sr. Luis que llegan solas desde el grupo de WhatsApp
// (11 nov 2026, lo pidió el dueño): Luis manda la foto de los pagos con un
// texto como "21.8 palos nuevo" (palos = millones). La app lee cada pago de la
// foto y decide si se guarda solo o queda por revisar.
//
// Reglas del dueño: la compensación va el día en que Luis la manda (no el que
// diga la tirilla) y con el monto exacto (1.800.002, no 1,8 palos).
//
// Mientras COMPENSACIONES_AUTO no esté en "1" (la primera semana) todo queda
// por revisar, pero la decisión igual se calcula y se muestra en la revisión.
//
// Lógica pura (sin Supabase ni React) para poder probarla sola.

/** Referencia del punto (código del corresponsal) que llevan todos los pagos de compensación. */
export const REFERENCIA_PUNTO = "68883";

/** Las fotos de compensación por confirmar (corr_soportes.contexto) van aparte de las tirillas de consignaciones. */
export const CONTEXTO_COMPENSACION = "luis-comp";

/** Diferencia aceptada entre la suma leída y los palos que escribió Luis. */
export const TOLERANCIA_PALOS = 100_000;

/** Un pago leído de la foto (lib/leer-compensacion.ts). */
export interface PagoLeido {
  /** "app" (Pago exitoso de Bancolombia), "redeban" (tirilla) o "cajero" (registro del cajero). */
  formato: string | null;
  /** true si el pago dice compensación del corresponsal (convenio 76477 o "Compensación corresponsal"). */
  es_compensacion: boolean;
  /** Pesos exactos. */
  monto: number | null;
  /** "HH:MM" en 24 horas. */
  hora: string | null;
  /** Referencia o código del punto que se pagó. */
  referencia: string | null;
  /** Número de comprobante, recibo o RRN. */
  comprobante: string | null;
  /** false si algún dígito del monto quedó dudoso o el pago no dice que fue exitoso. */
  seguro: boolean;
}

export interface FilaCompensacion {
  fecha: string;
  monto: number;
  hora: string | null;
  nota: string | null;
}

export interface DecisionCompensacion {
  accion: "guardar" | "revisar";
  /** Por qué queda por revisar (vacío si se guarda). */
  motivo: string;
  /** Lo que se registraría: un movimiento por pago, el día del mensaje. */
  filas: FilaCompensacion[];
  suma: number;
  /** Lo que dice el texto de Luis, en pesos (null si no dijo palos). */
  palos: number | null;
  /** La suma leída coincide con los palos. */
  cuadra: boolean;
}

/**
 * "21.8 palos nuevo" -> 21.800.000. Acepta coma o punto decimal ("21,8") y
 * "palo" en singular ("1 palo"). Devuelve null si el texto no dice palos.
 */
export function palosEnPesos(texto: string | null | undefined): number | null {
  const m = String(texto ?? "").match(/(\d+(?:[.,]\d+)?)\s*palos?\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1_000_000);
}

/**
 * Diferencia que se acepta según cómo escribió Luis el número: "3 palos" está
 * redondeado al millón y "21.8" a la décima, pero nunca más de 100.000 (un
 * dígito mal leído casi siempre pasa de ahí).
 */
export function toleranciaDe(texto: string | null | undefined): number {
  const m = String(texto ?? "").match(/\d+(?:[.,](\d+))?\s*palos?\b/i);
  const decimales = m?.[1]?.length ?? 0;
  return Math.min(TOLERANCIA_PALOS, (1_000_000 / 10 ** decimales) / 2);
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d/;

const NOMBRE_FORMATO: Record<string, string> = {
  app: "app Bancolombia",
  redeban: "Redeban",
  cajero: "cajero",
};

/** Nota del movimiento: de dónde salió y el número para buscarlo después. */
export function notaDePago(p: Pick<PagoLeido, "formato" | "comprobante">): string {
  const origen = NOMBRE_FORMATO[p.formato ?? ""] ?? "foto";
  const numero = p.comprobante ? `, comprobante ${p.comprobante}` : "";
  return `Compensación ${origen}${numero}`.slice(0, 200);
}

/** El pago es del punto: la referencia leída termina en el código del corresponsal. */
function esDelPunto(referencia: string | null): boolean {
  return (referencia ?? "").replace(/\D/g, "").endsWith(REFERENCIA_PUNTO);
}

/**
 * @param pagos lo que se leyó de la foto
 * @param texto lo que escribió Luis con la foto
 * @param dia día del mensaje en Bogotá (YYYY-MM-DD): ahí se registra
 * @param horaMensaje hora del mensaje en Bogotá, para los pagos sin hora legible
 * @param opciones.automatico COMPENSACIONES_AUTO está encendido
 * @param opciones.diaCerrado el cuadre de ese día ya se cerró
 * @param opciones.comprobantesRegistrados números de comprobante que ya están en compensaciones
 */
export function decidirCompensacion(
  pagos: PagoLeido[],
  texto: string | null,
  dia: string,
  horaMensaje: string | null,
  opciones: { automatico: boolean; diaCerrado: boolean; comprobantesRegistrados: string[] },
): DecisionCompensacion {
  const validos = pagos.filter((p) => typeof p.monto === "number" && Number.isInteger(p.monto) && p.monto > 0);
  const filas: FilaCompensacion[] = validos.map((p) => ({
    fecha: dia,
    monto: p.monto as number,
    hora: p.hora && HORA.test(p.hora) ? p.hora.slice(0, 5) : horaMensaje,
    nota: notaDePago(p),
  }));
  const suma = filas.reduce((s, f) => s + f.monto, 0);
  const palos = palosEnPesos(texto);
  const cuadra = palos !== null && filas.length > 0 && Math.abs(suma - palos) <= toleranciaDe(texto);

  const revisar = (motivo: string): DecisionCompensacion => ({ accion: "revisar", motivo, filas, suma, palos, cuadra });

  if (pagos.length === 0) return revisar("No se leyó ningún pago");
  if (validos.length < pagos.length) return revisar("Un pago quedó sin monto");
  if (pagos.some((p) => !p.es_compensacion)) return revisar("Un pago no dice compensación");
  if (pagos.some((p) => !esDelPunto(p.referencia))) return revisar(`Un pago no lleva la referencia ${REFERENCIA_PUNTO}`);
  if (pagos.some((p) => !p.seguro)) return revisar("Un dígito quedó dudoso");
  if (palos === null) return revisar("El mensaje no dice cuántos palos");
  if (!cuadra) return revisar("La suma no da los palos del mensaje");
  const ya = new Set(opciones.comprobantesRegistrados.map((c) => c.replace(/\D/g, "")).filter(Boolean));
  if (pagos.some((p) => p.comprobante && ya.has(p.comprobante.replace(/\D/g, "")))) {
    return revisar("Un comprobante ya estaba registrado");
  }
  if (opciones.diaCerrado) return revisar("El día ya está cerrado");
  if (!opciones.automatico) return revisar("Confírmala");

  return { accion: "guardar", motivo: "", filas, suma, palos, cuadra };
}
