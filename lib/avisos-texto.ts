// Textos de los avisos que le llegan al dueño por WhatsApp (12 nov 2026, los
// pidió el dueño): lo que entró solo y quedó por revisar, y el recordatorio de
// cierre de las 4:55 p. m. Los sirven app/api/agente/avisos y
// app/api/agente/cierre; una tarea de OpenClaw los manda al chat del dueño y,
// si el texto viene vacío, no manda nada.
//
// Lógica pura (sin Supabase) para poder probarla sola. Corto, sin emojis, con
// el formato de WhatsApp (*negrilla*).

import { formatCOP, formatFecha } from "./format.ts";

const URL_APP = "https://corresponsal-multias.vercel.app";

/** Una foto que entró sola desde el grupo y quedó esperando a alguien. */
export interface PendienteAviso {
  /** "comprobante" (tirilla del punto) o "compensacion" (foto del Sr. Luis). */
  tipo: "comprobante" | "compensacion";
  /** Día en que quedó (YYYY-MM-DD). */
  fecha: string;
  /** Lo que se alcanzó a leer, si se leyó algo. */
  monto: number | null;
  /** Por qué no entró sola. */
  motivo: string | null;
}

/** Lo que el dueño ya sabe por el tipo de foto no se repite como motivo. */
const MOTIVOS_SIN_DETALLE = new Set(["Confírmala"]);

function renglon(p: PendienteAviso): string {
  const que = p.tipo === "compensacion" ? "Compensación del Sr. Luis" : "Comprobante";
  const cuanto = p.monto && p.monto > 0 ? ` de ${formatCOP(p.monto)}` : "";
  const por = p.motivo && !MOTIVOS_SIN_DETALLE.has(p.motivo) ? `: ${p.motivo.replace(/\.$/, "")}` : "";
  return `- ${que}${cuanto}${por}`;
}

/**
 * Texto de los pendientes nuevos. Vacío si no hay ninguno (la tarea de OpenClaw
 * no manda nada). Un enlace por día, al final de cada grupo.
 */
export function textoPendientes(pendientes: PendienteAviso[]): string {
  if (pendientes.length === 0) return "";
  const dias = [...new Set(pendientes.map((p) => p.fecha))].sort();
  const titulo = pendientes.length === 1 ? "*1 foto por revisar*" : `*${pendientes.length} fotos por revisar*`;
  const bloques = dias.map((dia) => {
    const delDia = pendientes.filter((p) => p.fecha === dia);
    const encabezado = dias.length > 1 ? `${formatFecha(dia)}\n` : "";
    return `${encabezado}${delDia.map(renglon).join("\n")}\n${URL_APP}/luis?fecha=${dia}`;
  });
  return `${titulo}\n${bloques.join("\n\n")}`;
}

/** El cuadre del día, como lo guarda corr_cuadres (null si no se ha empezado). */
export interface CuadreDelDia {
  estado: string;
  saldo_final: number;
}

/**
 * Recordatorio de cierre: título y cuerpo, o null si el día está cerrado y
 * cuadrado. Lo usan el aviso del navegador (app/api/cron/recordatorios) y el
 * de WhatsApp (app/api/agente/cierre).
 */
export function mensajeCierre(cuadre: CuadreDelDia | null): { title: string; body: string } | null {
  const cerrado = cuadre?.estado === "cerrado";
  const saldo = Math.round(Number(cuadre?.saldo_final ?? 0));
  const descuadre = cuadre ? saldo !== 0 : false;
  const cuanto = formatCOP(Math.abs(saldo));
  if (!cerrado) {
    return {
      title: "Cierra el cuadre de hoy",
      body: descuadre
        ? `El día sigue abierto y hay un descuadre de ${cuanto}. Revísalo y ciérralo.`
        : "El día sigue abierto. Cuando tengas la tirilla, cuádralo y ciérralo.",
    };
  }
  if (descuadre) {
    return {
      title: "Descuadre del día",
      body: `El cuadre quedó con un ${saldo < 0 ? "sobrante" : "faltante"} de ${cuanto} sin justificar.`,
    };
  }
  return null;
}

/** El recordatorio de cierre en texto de WhatsApp. Vacío si no hay nada que decir. */
export function textoCierre(cuadre: CuadreDelDia | null, dia: string): string {
  const m = mensajeCierre(cuadre);
  return m ? `*${m.title}*\n${m.body}\n${URL_APP}/cuadre?fecha=${dia}` : "";
}
