// Mensajes cálidos para el saludo del Panel. Uno por día (rota por fecha).
// Sin emojis ni rayas largas, en tono cercano (Colombia).
export const MENSAJES_DIA = [
  "Hoy va a ser un buen día. Un paso a la vez y todo sale.",
  "Tu trabajo mantiene todo en orden. Gracias por la dedicación de cada día.",
  "Lo haces muy bien. Confía en ti, que aquí confiamos en vos.",
  "Cada cuadre que cierras es prueba de lo juiciosa que eres.",
  "Respira, sonríe y arranca. Tienes todo bajo control.",
  "Gracias por cuidar cada peso como si fuera tuyo.",
  "Tu constancia es la que hace que todo esto funcione.",
  "Que hoy te rinda el día y te sobre la calma.",
  "Eres pieza clave de este equipo. Se nota tu esfuerzo.",
  "Con paciencia y buena energía, las cosas salen bien.",
  "Un día más para brillar haciendo lo que sabes hacer.",
  "Tranquila con los descuadres: se revisan con calma y se resuelven.",
  "Hoy mereces un café rico y una jornada tranquila.",
  "Lo que haces importa, y lo haces con cariño. Gracias.",
  "Empieza suave, que el día es largo y tú puedes con él.",
  "Tu buena cara atiende mejor que cualquier sistema.",
  "Cada cliente bien atendido lleva tu sello.",
  "Confía en tu ritmo. Vas muy bien.",
  "Buen día para cerrar cuadrado e irte tranquila a casa.",
  "El orden que pones aquí se siente en todo el negocio.",
  "Que nada te quite la calma hoy. Vas a estar bien.",
  "Tu esfuerzo no pasa desapercibido. Mil gracias.",
  "Hazlo a tu manera, con calma y cuidado. Así queda perfecto.",
  "Buen día para hacer las cosas bien y sentirte orgullosa.",
  "Eres más capaz de lo que crees. Demuéstratelo hoy.",
  "Gracias por estar, por cumplir y por hacerlo con buena actitud.",
  "Una jornada tranquila empieza con buena actitud, y la tuya sobra.",
  "Cierra el día con la frente en alto: diste lo mejor.",
  "Que hoy todo cuadre, en la caja y en tu día.",
  "Vas bien, vas con calma, vas segura. Sigue así.",
  "Hoy es un buen día para sentirte orgullosa de tu trabajo.",
  "Gracias por la responsabilidad de siempre. Se valora mucho.",
] as const;

// Despedidas para el cierre del día. Cálidas, cercanas (Colombia), sin emojis.
export const MENSAJES_DESPEDIDA = [
  "Buen trabajo hoy. Ve a descansar.",
  "Día cerrado. Nos vemos mañana.",
  "Lo hiciste muy bien. Hasta mañana.",
  "Gracias por tu trabajo de hoy.",
  "A descansar, que te lo ganaste.",
  "Otro día sacado adelante. Bien hecho.",
  "Hasta mañana, con esa misma buena actitud.",
  "Terminaste por hoy. Ve tranquila.",
  "Cerraste con todo. Descansa rico.",
  "Día cumplido. Nos vemos mañana temprano.",
  "Lo diste todo hoy. Gracias.",
  "Buen cierre. Ahora a descansar.",
  "Trabajo hecho. Disfruta tu noche.",
  "Bien cerrado. Que descanses.",
] as const;

/** Despedida del día: estable por fecha ISO, distinta cada día. */
export function despedidaDelDia(fechaISO: string): string {
  const n = fechaISO.replace(/-/g, "");
  let h = 7;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return MENSAJES_DESPEDIDA[h % MENSAJES_DESPEDIDA.length];
}

/** Saludo según la hora (Bogotá), recibida como número 0-23. */
export function saludoHora(hora: number): string {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Mensaje del día: estable por fecha ISO (YYYY-MM-DD), distinto cada día. */
export function mensajeDelDia(fechaISO: string): string {
  const n = fechaISO.replace(/-/g, "");
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return MENSAJES_DIA[h % MENSAJES_DIA.length];
}

// Mensaje fijo personalizado por persona (clave = primer nombre en minúsculas).
const MENSAJES_PERSONA: Record<string, string> = {
  carolina: "¡Qué linda estás hoy!",
};

/** Mensaje a mostrar: si la persona tiene mensaje personalizado lo usa; si no, el del día. */
export function mensajePersonal(nombre: string, fechaISO: string): string {
  const primer = nombre.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return MENSAJES_PERSONA[primer] ?? mensajeDelDia(fechaISO);
}

// Género por persona para el saludo ("f" = femenino). Si no está, se infiere del nombre.
const GENERO_PERSONA: Record<string, "f" | "m"> = {
  carolina: "f",
};

/** True si el saludo debe ir en femenino (¡Bienvenida!). Garantizado por persona; si no, heurística. */
export function esFemenino(nombre: string): boolean {
  const primer = nombre.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const g = GENERO_PERSONA[primer];
  if (g) return g === "f";
  return /a$/.test(primer);
}
