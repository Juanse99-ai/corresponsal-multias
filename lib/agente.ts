import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Lo común de las entradas del agente (app/api/agente/*): la clave y el día del
 * mensaje. Se entra con `Authorization: Bearer <AGENTE_TOKEN>` (variable de Vercel).
 */
export function tokenValido(req: Request): boolean {
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const esperado = process.env.AGENTE_TOKEN;
  if (!esperado || !dado) return false;
  // Comparar resúmenes del mismo largo: no se filtra por tiempo cuánto acertó.
  const a = createHash("sha256").update(dado).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/** Día (YYYY-MM-DD) de un instante en Bogotá. */
export function diaBogota(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Hora (HH:MM, 24 horas) de un instante en Bogotá. */
export function horaBogota(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ms));
}
