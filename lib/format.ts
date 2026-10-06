// Formato de pesos colombianos y fechas. Sin decimales (los montos son enteros).

/** "$10.716.000" / "-$700". Punto como separador de miles (es-CO). */
export function formatCOP(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("es-CO")}`;
}

/** Igual que formatCOP pero sin el signo $ (para inputs / tablas densas). */
export function formatMiles(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toLocaleString("es-CO")}`;
}

/** Compacta montos grandes: 10.716.000 -> "10,7M". Para tarjetas de resumen. */
export function formatCompactCOP(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${abs}`;
}

/** Quita todo lo que no sea dígito y devuelve el entero. "10.716.000" -> 10716000 */
export function parseMontoInput(raw: string): number {
  const digits = (raw ?? "").toString().replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Inserta separadores de miles mientras se escribe: "10716000" -> "10.716.000" */
export function maskMiles(raw: string): string {
  const n = parseMontoInput(raw);
  return n ? n.toLocaleString("es-CO") : "";
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** ISO "2026-06-16" -> "16 jun 2026" (sin desfase de zona horaria). */
export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

/** ISO -> "lun 16 jun" */
export function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[wd]} ${d} ${MESES[m - 1]}`;
}

/** ISO -> "lunes, 16 de junio" (titulo largo). */
export function formatFechaLarga(iso: string): string {
  const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const s = `${DIAS_L[wd]}, ${d} de ${MESES_L[m - 1]} de ${y}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Fecha de hoy en ISO, SIEMPRE en hora de Colombia (America/Bogota).
 * No usa la zona del proceso: en Vercel el servidor corre en UTC y entre las
 * 7pm y medianoche de Bogotá devolvía el día siguiente, haciendo que el cuadre
 * y los movimientos se guardaran en el día equivocado.
 */
export function hoyISO(): string {
  // "en-CA" formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Hora actual "HH:MM" en Colombia, igual que hoyISO: no depende del reloj ni de
 * la zona del dispositivo, que puede estar en otra hora y guardar el movimiento
 * con una hora que no corresponde al día del punto.
 */
export function horaBogotaHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Año actual en Colombia (para completar fechas escritas sin año). */
export function anioBogota(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric" }).format(new Date()),
  );
}

/** Suma/resta días a una fecha ISO devolviendo ISO. */
export function addDiasISO(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/** "14:32" desde un time "14:32:00" o null. */
export function formatHora(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** Hora (0 a 23) y minutos de un instante en Colombia, en números. */
function horaMinutoBogota(d: Date): { h: number; m: number } {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return { h: valor("hour"), m: valor("minute") };
}

/**
 * ISO timestamp -> "03:45 p. m." (solo la hora) en hora de Colombia.
 *
 * Se arma a mano en vez de pedírselo a Intl en "es-CO": el ICU de Node escribe
 * "p. m." con un espacio normal y el del navegador con uno de no separación, y
 * esa diferencia invisible rompía la hidratación (React #418) en Movimientos y
 * en la Bitácora. Va como lo pinta el navegador: espacio normal antes de
 * "p. m." (la hora puede partir línea ahí) y de no separación adentro.
 */
export function formatHoraISO(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const { h, m } = horaMinutoBogota(d);
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "a.\u00a0m." : "p.\u00a0m."}`;
}

/** ISO timestamp -> "17 jun, 03:45 p. m." en hora de Colombia (a mano, como formatHoraISO). */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [, mes, dd] = dia.split("-").map(Number);
  return `${dd} ${MESES[mes - 1]}, ${formatHoraISO(iso)}`;
}
