// Latido del puente de WhatsApp (17 nov 2026, lo pidió el dueño): el puente
// de OpenClaw, en el Mac del dueño, le avisa a la app cada 5 minutos que sigue
// vivo. Si en horario de trabajo pasa un rato sin latido (el Mac se durmió, se
// quedó sin internet o WhatsApp se desconectó), las fotos del grupo dejan de
// entrar: la app avisa con una notificación (no por WhatsApp, que es lo caído).
//
// Lógica pura para poder probarla sola.

/** Sin latido por más de esto, el puente se da por caído. */
export const MINUTOS_SIN_LATIDO = 15;
/** Horario en que se vigila (Bogotá): de 7:00 a 20:59. */
export const HORA_INICIO = 7;
export const HORA_FIN = 21;

export type DecisionLatido = "nada" | "avisar_caido" | "avisar_volvio";

/**
 * @param ultimo último latido (ISO), o null si nunca ha llegado
 * @param avisado latido sobre el que ya se avisó la caída ("" si no hay caída avisada)
 * @param ahoraMs ahora, en milisegundos
 * @param horaBogota hora actual en Bogotá (0-23)
 */
export function decidirLatido(ultimo: string | null, avisado: string, ahoraMs: number, horaBogota: number): DecisionLatido {
  if (!ultimo) return "nada"; // El puente nunca ha mandado latido: no hay contra qué comparar.
  const edad = ahoraMs - Date.parse(ultimo);
  const caido = !Number.isFinite(edad) || edad > MINUTOS_SIN_LATIDO * 60_000;
  if (!caido) return avisado ? "avisar_volvio" : "nada";
  const enHorario = horaBogota >= HORA_INICIO && horaBogota < HORA_FIN;
  return enHorario && avisado !== ultimo ? "avisar_caido" : "nada";
}
