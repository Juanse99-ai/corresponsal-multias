// Lógica pura de préstamos (sin acceso a datos): agrupar por persona y unificar
// nombres escritos distinto. Vive aparte de queries.ts para poder probarse sola.
import type { DeudaConSaldo } from "@/lib/queries";

export interface PersonaSaldo {
  persona: string;
  saldo: number;
  total: number;
  abonado: number;
}

export interface PersonaGrupo extends PersonaSaldo {
  /** Nombre normalizado; es la clave real de agrupación (y la key de React). */
  key: string;
  /** Préstamos de la persona: primero los que deben, luego los saldados. */
  deudas: DeudaConSaldo[];
  /** Cuántos préstamos siguen con saldo pendiente. */
  activos: number;
}

/**
 * Clave para agrupar un mismo nombre escrito distinto: quita tildes, mayúsculas
 * y espacios de más, para que "caro", "Caro " y "Caró" caigan en la misma persona.
 */
export function claveNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tildes
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Agrupa los préstamos por persona, con su detalle y sus totales. */
export function agruparDeudasPorPersona(deudas: DeudaConSaldo[]): PersonaGrupo[] {
  const grupos = new Map<string, PersonaGrupo>();
  // Cómo escribió cada quien el nombre, para mostrar la variante más usada.
  const variantes = new Map<string, Map<string, number>>();

  for (const d of deudas) {
    const nombre = d.persona.trim() || "Sin nombre";
    const key = claveNombre(nombre) || "sin nombre";

    const g = grupos.get(key) ?? { key, persona: nombre, deudas: [], saldo: 0, total: 0, abonado: 0, activos: 0 };
    g.deudas.push(d);
    g.saldo += d.saldo;
    g.total += d.monto;
    g.abonado += d.abonado;
    if (d.saldo > 0) g.activos += 1;
    grupos.set(key, g);

    const v = variantes.get(key) ?? new Map<string, number>();
    v.set(nombre, (v.get(nombre) ?? 0) + 1);
    variantes.set(key, v);
  }

  for (const g of grupos.values()) {
    // Muestra la forma más usada del nombre; si empatan, la más larga (suele traer tilde o apellido).
    const usados = [...(variantes.get(g.key) ?? new Map<string, number>())];
    usados.sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    if (usados[0]) g.persona = usados[0][0];
    // Pendientes arriba; dentro de cada bloque, lo más reciente primero.
    g.deudas.sort((a, b) => Number(b.saldo > 0) - Number(a.saldo > 0) || b.fecha.localeCompare(a.fecha));
  }

  // Quien más debe va primero; los que están al día quedan al final, alfabéticos.
  return [...grupos.values()].sort((a, b) => b.saldo - a.saldo || a.persona.localeCompare(b.persona, "es"));
}

/** Resumen por persona, sin el detalle de cada préstamo (para el panel). */
export function agruparPorPersona(deudas: DeudaConSaldo[]): PersonaSaldo[] {
  return agruparDeudasPorPersona(deudas).map(({ persona, saldo, total, abonado }) => ({
    persona,
    saldo,
    total,
    abonado,
  }));
}
