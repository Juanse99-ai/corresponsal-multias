// Reglas de la entrada con clave de caja (app/caja), sin React ni Supabase,
// para poder probarlas (test/caja.test.ts).
//
// La clave es de 6 dígitos y es de cada persona. Solo sirve en un equipo que el
// administrador autorizó (cookie httpOnly con un token cuyo hash vive en
// corr_equipos). Cifrarla (bcrypt), verificarla y contar los intentos se hace
// DENTRO de Postgres, con las filas bloqueadas mientras revisa
// (supabase/migrations/0005_caja_clave_funciones.sql): así varios intentos al
// mismo tiempo no se saltan el bloqueo. Tras 5 claves malas la persona queda
// bloqueada 5 minutos, y se dobla con cada mala de más hasta 60; el equipo,
// igual desde 15 malas sumando personas.

import { createHash, randomBytes } from "node:crypto";

export const LARGO_CLAVE = 6;
/** La cookie dura lo máximo que dejan los navegadores (400 días). */
export const DURACION_EQUIPO_S = 400 * 24 * 60 * 60;

/** Error de una clave nueva, o null si sirve. Rechaza las obvias. */
export function errorClaveNueva(clave: string): string | null {
  if (!new RegExp(`^\\d{${LARGO_CLAVE}}$`).test(clave)) return `La clave son ${LARGO_CLAVE} números.`;
  if (/^(\d)\1+$/.test(clave)) return "Muy fácil: todos los números iguales.";
  const sube = "01234567890123456";
  const baja = "98765432109876543";
  if (sube.includes(clave) || baja.includes(clave)) return "Muy fácil: números seguidos.";
  return null;
}

/** Minutos que faltan de un bloqueo (redondeado hacia arriba), o 0. */
export function minutosRestantes(hasta: string | Date | null | undefined, ahora: Date = new Date()): number {
  if (!hasta) return 0;
  const ms = new Date(hasta).getTime() - ahora.getTime();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/** Lo que contesta corr_caja_verificar, en palabras para la pantalla. */
export function mensajeVerificacion(
  r: { ok?: boolean; motivo?: string; quedan?: number; hasta?: string | null },
  ahora: Date = new Date(),
): string | null {
  if (r.ok) return null;
  const min = minutosRestantes(r.hasta, ahora);
  switch (r.motivo) {
    case "equipo":
      return "Este equipo no está autorizado.";
    case "equipo_bloqueado":
      return `Equipo bloqueado. Intenta en ${min} min.`;
    case "sin_clave":
      return "Esa persona no tiene clave.";
    case "bloqueada":
      return `Bloqueada. Intenta en ${min} min.`;
    case "mala":
      if (min) return `Clave mala. Bloqueada ${min} min.`;
      return `Clave mala. ${r.quedan === 1 ? "Queda 1 intento" : `Quedan ${r.quedan ?? 0} intentos`}.`;
    default:
      return "No se pudo entrar.";
  }
}

/** Token nuevo de un equipo (va en la cookie) y su hash (va en la base). */
export function tokenEquipo(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
