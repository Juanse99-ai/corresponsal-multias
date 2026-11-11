// Texto del resumen de las 7 a.m. que le llega al dueño por WhatsApp
// (app/api/agente/resumen/route.ts lo sirve; una tarea de OpenClaw lo manda).
// Corto, sin emojis, con el formato de WhatsApp (*negrilla*).
//
// Lógica pura (sin Supabase) para poder probarla sola.

export interface DatosResumen {
  /** Día del resumen (hoy, YYYY-MM-DD en Bogotá). */
  hoy: string;
  /** Día que se resume (ayer). */
  ayer: string;
  cuadreAyer: { estado: string; saldoFinal: number } | null;
  luis: {
    consignaciones: number;
    totalConsignaciones: number;
    totalCompensaciones: number;
    /** Saldo acumulado a favor del Sr. Luis al cierre de ayer. */
    saldo: number;
  };
  /** Fotos de comprobantes del Sr. Luis de la última semana que siguen sin cargar. */
  fotosPorRevisar: number;
  prestamos: { personas: number; total: number };
  /** null si no se pudo leer el taller: esa parte se omite. */
  taller: {
    /** OT abiertas por estado ("Esperando Repuestos" -> 2). */
    abiertas: Record<string, number>;
    porCobrar: { cantidad: number; total: number };
  } | null;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function pesos(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("es-CO")}`;
}

function diaLargo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[wd]} ${d} ${MESES[m - 1]}`;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

function lineaCuadre(c: DatosResumen["cuadreAyer"]): string {
  if (!c) return "Cuadre: no se abrió";
  if (c.estado !== "cerrado") {
    return c.saldoFinal === 0 ? "Cuadre: sigue abierto" : `Cuadre: sigue abierto, con descuadre de ${pesos(Math.abs(c.saldoFinal))}`;
  }
  if (Math.round(c.saldoFinal) === 0) return "Cuadre: cerrado y cuadrado";
  // Igual que el cron de recordatorios: saldo negativo es sobrante, positivo faltante.
  return `Cuadre: cerrado con ${c.saldoFinal < 0 ? "sobrante" : "faltante"} de ${pesos(Math.abs(c.saldoFinal))}`;
}

/** Estados del taller en minúscula y en el orden en que conviene leerlos. */
function lineaTaller(abiertas: Record<string, number>): string {
  const total = Object.values(abiertas).reduce((s, n) => s + n, 0);
  if (total === 0) return "En el taller: ninguno";
  const partes = Object.entries(abiertas)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([estado, n]) => `${n} ${estado.toLowerCase().replace("diagnostico", "diagnóstico")}`);
  return `En el taller: ${total} (${partes.join(", ")})`;
}

export function textoResumen(d: DatosResumen): string {
  const l: string[] = [];
  l.push(`*Resumen del ${diaLargo(d.hoy)}*`);
  l.push("");
  l.push(`*Corresponsal, ${diaLargo(d.ayer)}*`);
  l.push(lineaCuadre(d.cuadreAyer));
  l.push(
    d.luis.consignaciones === 0
      ? "Sr. Luis: sin consignaciones"
      : `Sr. Luis: ${plural(d.luis.consignaciones, "consignación", "consignaciones")} por ${pesos(d.luis.totalConsignaciones)}` +
          (d.luis.totalCompensaciones > 0 ? `, compensación ${pesos(d.luis.totalCompensaciones)}` : ""),
  );
  l.push(
    d.luis.saldo >= 0
      ? `Saldo a favor de Luis: ${pesos(d.luis.saldo)}`
      : `Saldo a favor del punto: ${pesos(Math.abs(d.luis.saldo))}`,
  );
  if (d.fotosPorRevisar > 0) {
    l.push(`Por revisar: ${plural(d.fotosPorRevisar, "foto de comprobante", "fotos de comprobantes")} en Sr. Luis`);
  }
  if (d.prestamos.total > 0) {
    l.push(`Préstamos por cobrar: ${pesos(d.prestamos.total)} (${plural(d.prestamos.personas, "persona", "personas")})`);
  }
  if (d.taller) {
    l.push("");
    l.push("*Taller*");
    l.push(lineaTaller(d.taller.abiertas));
    if (d.taller.porCobrar.cantidad > 0) {
      l.push(
        `Por cobrar: ${plural(d.taller.porCobrar.cantidad, "OT completada", "OT completadas")}, ${pesos(d.taller.porCobrar.total)}`,
      );
    }
  }
  return l.join("\n");
}
