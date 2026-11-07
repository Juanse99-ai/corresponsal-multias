// Reglas compartidas del acceso: login, recuperar clave y clave nueva.

/** Dominio de los usuarios cortos: "ivana" entra como "ivana@multias.co". */
const DOMINIO_USUARIOS = "multias.co";

/** Pasa lo que la persona escribió (usuario o correo) al correo de la cuenta. */
export function aCorreo(raw: string): string {
  const limpio = raw.trim().toLowerCase();
  if (!limpio) return "";
  return limpio.includes("@") ? limpio : `${limpio}@${DOMINIO_USUARIOS}`;
}

export const CLAVE_MINIMA = 8;

/** Error para mostrar si la clave nueva no sirve; null si está bien. */
export function errorClaveNueva(clave: string, repetida: string): string | null {
  if (clave.length < CLAVE_MINIMA) return `La clave debe tener al menos ${CLAVE_MINIMA} caracteres.`;
  if (clave !== repetida) return "Las dos claves no coinciden.";
  return null;
}
