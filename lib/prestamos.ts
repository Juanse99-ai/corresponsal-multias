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

// ===== Origen de los abonos: de dónde sale la plata con la que se paga =====

export interface OrigenMonto {
  /** null = abonos sin etiqueta. */
  origen: string | null;
  monto: number;
  abonos: number;
}

/** La forma más usada de cada nombre; si empatan, la más larga (suele traer tilde). */
function variantePreferida(conteo: Map<string, number>): string {
  return [...conteo].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
}

/**
 * Orígenes ya usados en cualquier abono, para ofrecerlos como fichas. Unifica
 * "taller" y "Taller " igual que los nombres de persona; los más usados primero.
 */
export function origenesUsados(abonos: { origen: string | null }[]): string[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const a of abonos) {
    const nombre = a.origen?.trim();
    if (!nombre) continue;
    const key = claveNombre(nombre);
    const v = grupos.get(key) ?? new Map<string, number>();
    v.set(nombre, (v.get(nombre) ?? 0) + 1);
    grupos.set(key, v);
  }
  return [...grupos.values()]
    .map((v) => ({ nombre: variantePreferida(v), usos: [...v.values()].reduce((s, n) => s + n, 0) }))
    .sort((a, b) => b.usos - a.usos || a.nombre.localeCompare(b.nombre, "es"))
    .map((o) => o.nombre);
}

/** Cuánto se ha pagado de cada origen: el más grande primero y lo sin etiqueta al final. */
export function resumenOrigenes(abonos: { origen: string | null; monto: number }[]): OrigenMonto[] {
  const grupos = new Map<string, { variantes: Map<string, number>; monto: number; abonos: number }>();
  for (const a of abonos) {
    const nombre = a.origen?.trim() || "";
    const key = nombre ? claveNombre(nombre) : "";
    const g = grupos.get(key) ?? { variantes: new Map<string, number>(), monto: 0, abonos: 0 };
    if (nombre) g.variantes.set(nombre, (g.variantes.get(nombre) ?? 0) + 1);
    g.monto += a.monto;
    g.abonos += 1;
    grupos.set(key, g);
  }
  return [...grupos.entries()]
    .map(([key, g]) => ({ origen: key ? variantePreferida(g.variantes) : null, monto: g.monto, abonos: g.abonos }))
    .sort((a, b) => Number(a.origen === null) - Number(b.origen === null) || b.monto - a.monto);
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

/**
 * Igual que agruparPorPersona pero sobre filas ya agregadas en SQL
 * ({persona, monto, abonado}), sin bajar los abonos: unifica nombres y suma.
 */
export function resumenPorPersona(rows: { persona: string; monto: number; abonado: number }[]): PersonaSaldo[] {
  const grupos = new Map<string, PersonaSaldo>();
  const variantes = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const nombre = r.persona.trim() || "Sin nombre";
    const key = claveNombre(nombre) || "sin nombre";
    const g = grupos.get(key) ?? { persona: nombre, saldo: 0, total: 0, abonado: 0 };
    g.saldo += Math.max(0, r.monto - r.abonado);
    g.total += r.monto;
    g.abonado += r.abonado;
    grupos.set(key, g);

    const v = variantes.get(key) ?? new Map<string, number>();
    v.set(nombre, (v.get(nombre) ?? 0) + 1);
    variantes.set(key, v);
  }

  for (const [key, g] of grupos) {
    const usados = [...(variantes.get(key) ?? new Map<string, number>())];
    usados.sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    if (usados[0]) g.persona = usados[0][0];
  }

  return [...grupos.values()].sort((a, b) => b.saldo - a.saldo || a.persona.localeCompare(b.persona, "es"));
}
