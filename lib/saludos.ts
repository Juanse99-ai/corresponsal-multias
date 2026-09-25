// Saludo del Panel y de la bienvenida.

/** Saludo según la hora (Bogotá), recibida como número 0-23. */
export function saludoHora(hora: number): string {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Mensaje fijo personalizado por persona (clave = primer nombre en minúsculas).
const MENSAJES_PERSONA: Record<string, string> = {
  carolina: "¡Qué linda estás hoy!",
};

/** Mensaje personal de la persona, si tiene uno. Sin mensaje, se muestra la fecha. */
export function mensajePersonal(nombre: string): string | null {
  const primer = nombre.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return MENSAJES_PERSONA[primer] ?? null;
}
