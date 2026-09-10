import { createClient } from "@/lib/supabase/server";
import {
  buscarSobreTope,
  buscarDuplicados,
  buscarDiasSinCuadre,
  ordenarHallazgos,
  type Hallazgo,
} from "@/lib/auditoria";
import type {
  CuadreRow,
  ConsignacionLuisRow,
  CompensacionLuisRow,
  DeudaRow,
  AbonoRow,
  SoporteRow,
  GeneralRow,
  MovPropioRow,
  AuditRow,
  MovimientoRow,
} from "@/lib/database.types";

export const SOPORTES_BUCKET = "corr-soportes";

export function sumMontos(rows: { monto: number }[]): number {
  return rows.reduce((s, r) => s + r.monto, 0);
}

// ===== Libro de movimientos del dia =====
export async function getMovimientos(fecha: string): Promise<MovimientoRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_movimientos")
    .select("*")
    .eq("fecha", fecha)
    .order("hora", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export interface MovimientosTotales {
  consignacion_nequi: number;
  consignacion_bancolombia: number;
  retiro: number;
  recaudo: number;
  cantidad: number;
}

export function totalesMovimientos(rows: MovimientoRow[]): MovimientosTotales {
  const t: MovimientosTotales = {
    consignacion_nequi: 0,
    consignacion_bancolombia: 0,
    retiro: 0,
    recaudo: 0,
    cantidad: rows.length,
  };
  for (const r of rows) {
    if (r.tipo === "consignacion_nequi") t.consignacion_nequi += r.monto;
    else if (r.tipo === "consignacion_bancolombia") t.consignacion_bancolombia += r.monto;
    else if (r.tipo === "retiro") t.retiro += r.monto;
    else if (r.tipo === "recaudo") t.recaudo += r.monto;
  }
  return t;
}

export async function getConsignacionesLuis(fecha: string): Promise<ConsignacionLuisRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_consignaciones_luis")
    .select("*")
    .eq("fecha", fecha)
    .order("hora", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getCompensacionesLuis(fecha: string): Promise<CompensacionLuisRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_compensaciones_luis")
    .select("*")
    .eq("fecha", fecha)
    .order("hora", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Saldo de Luis de un dia = cupo (compensaciones) - consignaciones de ese dia. */
export async function getSaldoLuisDia(fecha: string): Promise<number> {
  const sb = await createClient();
  const [{ data: cons }, { data: comp }] = await Promise.all([
    sb.from("corr_consignaciones_luis").select("monto").eq("fecha", fecha),
    sb.from("corr_compensaciones_luis").select("monto").eq("fecha", fecha),
  ]);
  return sumMontos(comp ?? []) - sumMontos(cons ?? []);
}

/**
 * Saldo ACUMULADO de Luis (su dinero, exclusivo). Suma de (cupo - consignaciones)
 * de todos los dias hasta `hasta`. Positivo = a favor de Luis.
 * incluir=false => acumulado hasta el dia anterior (lo que se arrastra).
 */
export async function getSaldoLuisAcumulado(hasta: string, incluir: boolean): Promise<number> {
  // Agregado en SQL (RPC): antes bajaba todas las filas y sumaba en JS.
  const sb = await createClient();
  const { data } = await sb.rpc("corr_saldo_luis", { p_hasta: hasta, p_incluir: incluir });
  return Number(data ?? 0);
}

export interface LuisHistDia {
  fecha: string;
  consignaciones: number;
  compensaciones: number;
  saldoDia: number;
  acumulado: number;
}

/** Historial de Luis por dia: consig/comp/saldo del dia + acumulado a favor. Mas reciente primero. */
export async function listLuisHistorial(): Promise<LuisHistDia[]> {
  // Agrupado por día en SQL (RPC): antes bajaba todas las filas de ambas tablas.
  const sb = await createClient();
  const { data } = await sb.rpc("corr_luis_historial");
  let acc = 0;
  const asc: LuisHistDia[] = (data ?? []).map((r) => {
    const consignaciones = Number(r.consignaciones);
    const compensaciones = Number(r.compensaciones);
    const saldoDia = compensaciones - consignaciones;
    acc += saldoDia;
    return { fecha: r.fecha, consignaciones, compensaciones, saldoDia, acumulado: acc };
  });
  return asc.reverse();
}

export interface SoporteConUrl extends SoporteRow {
  url: string | null;
}

/** Soportes del dia con URL firmada (bucket privado, 2h de validez). */
export async function getSoportes(fecha: string, contexto = "cuadre"): Promise<SoporteConUrl[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_soportes")
    .select("*")
    .eq("fecha", fecha)
    .eq("contexto", contexto)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: signed } = await sb.storage
    .from(SOPORTES_BUCKET)
    .createSignedUrls(rows.map((r) => r.path), 60 * 60 * 2);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.path) ?? null }));
}

// ===== Control general (admin) =====
export async function getGeneralEntries(limit = 180): Promise<GeneralRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_general")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getGeneralEntry(fecha: string): Promise<GeneralRow | null> {
  const sb = await createClient();
  const { data } = await sb.from("corr_general").select("*").eq("fecha", fecha).maybeSingle();
  return data ?? null;
}

export interface MovPropioConUrl extends MovPropioRow {
  url: string | null;
}

export async function getMovPropios(limit = 120): Promise<MovPropioConUrl[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_mov_propios")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const conPath = rows.filter((r) => r.soporte_path) as MovPropioRow[];
  const urlByPath = new Map<string, string>();
  if (conPath.length > 0) {
    const { data: signed } = await sb.storage
      .from(SOPORTES_BUCKET)
      .createSignedUrls(conPath.map((r) => r.soporte_path as string), 60 * 60 * 2);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }
  return rows.map((r) => ({ ...r, url: r.soporte_path ? urlByPath.get(r.soporte_path) ?? null : null }));
}

export async function getCuadre(fecha: string): Promise<CuadreRow | null> {
  const sb = await createClient();
  const { data } = await sb.from("corr_cuadres").select("*").eq("fecha", fecha).maybeSingle();
  return data ?? null;
}

/**
 * Saldo de Luis arrastrado al dia `fecha`: saldo (compensaciones - consignaciones)
 * del dia mas reciente con movimientos anterior a `fecha`.
 */
export async function getCompensadoSugerido(fecha: string): Promise<number> {
  const sb = await createClient();
  const [{ data: c1 }, { data: c2 }] = await Promise.all([
    sb.from("corr_consignaciones_luis").select("fecha").lt("fecha", fecha).order("fecha", { ascending: false }).limit(1),
    sb.from("corr_compensaciones_luis").select("fecha").lt("fecha", fecha).order("fecha", { ascending: false }).limit(1),
  ]);
  const candidatas = [c1?.[0]?.fecha, c2?.[0]?.fecha].filter(Boolean) as string[];
  if (candidatas.length === 0) return 0;
  const prev = candidatas.sort().reverse()[0];
  return getSaldoLuisDia(prev);
}

export async function listCuadres(
  desde?: string,
  hasta?: string,
  limit = 120,
): Promise<CuadreRow[]> {
  const sb = await createClient();
  let q = sb.from("corr_cuadres").select("*").order("fecha", { ascending: false });
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  const { data } = await q.limit(limit);
  return data ?? [];
}

export interface DeudaConSaldo extends DeudaRow {
  abonos: AbonoRow[];
  abonado: number;
  saldo: number;
}

export async function getDeudasConSaldo(): Promise<DeudaConSaldo[]> {
  const sb = await createClient();
  const [{ data: deudas }, { data: abonos }] = await Promise.all([
    sb.from("corr_deudas").select("*").order("created_at", { ascending: false }),
    sb.from("corr_abonos").select("*").order("fecha", { ascending: false }),
  ]);

  const porDeuda = new Map<string, AbonoRow[]>();
  for (const a of abonos ?? []) {
    const arr = porDeuda.get(a.deuda_id) ?? [];
    arr.push(a);
    porDeuda.set(a.deuda_id, arr);
  }

  return (deudas ?? []).map((d) => {
    const ab = porDeuda.get(d.id) ?? [];
    const abonado = ab.reduce((s, x) => s + x.monto, 0);
    return { ...d, abonos: ab, abonado, saldo: Math.max(0, d.monto - abonado) };
  });
}

/** Préstamos (deudas) registrados en una fecha, con su saldo pendiente. */
export async function getPrestamosDia(fecha: string): Promise<DeudaConSaldo[]> {
  const sb = await createClient();
  const { data: deudas } = await sb
    .from("corr_deudas")
    .select("*")
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });
  const rows = deudas ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((d) => d.id);
  const { data: abonos } = await sb.from("corr_abonos").select("*").in("deuda_id", ids);
  const porDeuda = new Map<string, AbonoRow[]>();
  for (const a of abonos ?? []) {
    const arr = porDeuda.get(a.deuda_id) ?? [];
    arr.push(a);
    porDeuda.set(a.deuda_id, arr);
  }
  return rows.map((d) => {
    const ab = porDeuda.get(d.id) ?? [];
    const abonado = ab.reduce((s, x) => s + x.monto, 0);
    return { ...d, abonos: ab, abonado, saldo: Math.max(0, d.monto - abonado) };
  });
}

/** Suma de saldos pendientes (lo que de verdad afecta la caja del día). */
export function totalPrestamosPendientes(rows: DeudaConSaldo[]): number {
  return rows.reduce((s, d) => s + d.saldo, 0);
}

/** Saldos pendientes separados por medio: transferencia (va en la tirilla) vs efectivo (va en el arqueo). */
export function prestamosPendientesPorMedio(rows: DeudaConSaldo[]): { transferencia: number; efectivo: number } {
  let transferencia = 0;
  let efectivo = 0;
  for (const d of rows) {
    if (d.saldo <= 0) continue;
    if (d.medio === "transferencia") transferencia += d.saldo;
    else if (d.medio === "efectivo") efectivo += d.saldo;
    // "registro": solo queda como deuda por cobrar; no entra ni a tirilla ni a caja.
  }
  return { transferencia, efectivo };
}

/** True si el cuadre de esa fecha ya está cerrado (para bloquear ediciones). */
export async function diaEstaCerrado(fecha: string): Promise<boolean> {
  const sb = await createClient();
  const { data } = await sb.from("corr_cuadres").select("estado").eq("fecha", fecha).maybeSingle();
  return data?.estado === "cerrado";
}

// ===== Resumen para el header (avisos + buscador) =====
export interface HeaderResumen {
  // total_tirilla sale del cuadre que ya se lee aquí: sirve para distinguir
  // "todavía sin tirilla" de un descuadre real (no agrega consultas).
  cuadreHoy: { estado: string; saldo_final: number; total_tirilla: number } | null;
  prestamosTotal: number;
  prestamosCount: number;
  personas: string[];
  tarde: boolean; // ya pasó la hora de cerrar (>= 6pm Colombia)
}

export async function getHeaderResumen(fecha: string): Promise<HeaderResumen> {
  // Corre en el layout (cada carga de página): un RPC agregado en vez de bajar
  // todas las deudas y abonos para sumarlas aquí.
  const sb = await createClient();
  const [cuadre, { data: resumen }] = await Promise.all([getCuadre(fecha), sb.rpc("corr_header_resumen")]);
  const horaBogota = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hour12: false }).format(new Date()),
  );
  return {
    cuadreHoy: cuadre
      ? { estado: cuadre.estado, saldo_final: cuadre.saldo_final, total_tirilla: cuadre.total_tirilla }
      : null,
    prestamosTotal: Number(resumen?.prestamos_total ?? 0),
    prestamosCount: Number(resumen?.prestamos_count ?? 0),
    personas: resumen?.personas ?? [],
    tarde: horaBogota >= 18,
  };
}

/** Deudas con su abonado ya agregado en SQL (sin detalle de abonos): para resúmenes. */
export async function getDeudasSaldos(): Promise<{ persona: string; monto: number; abonado: number }[]> {
  const sb = await createClient();
  const { data } = await sb.rpc("corr_deudas_saldos");
  return data ?? [];
}

// ===== Bitácora de auditoría (admin) =====
export interface AuditEntry extends AuditRow {
  actorNombre: string;
}

export async function getAuditLog(limit = 250): Promise<AuditEntry[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const nombreById = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await sb.from("corr_profiles").select("id, nombre").in("id", ids);
    for (const p of profs ?? []) nombreById.set(p.id, p.nombre);
  }
  return rows.map((r) => ({
    ...r,
    actorNombre: r.actor_id ? nombreById.get(r.actor_id) ?? "Desconocido" : "Sistema",
  }));
}

// Agrupación por persona: lógica pura en lib/prestamos.ts (se reexporta aquí para
// no romper los imports existentes desde "@/lib/queries").
export type { PersonaSaldo, PersonaGrupo } from "@/lib/prestamos";
export { agruparDeudasPorPersona, agruparPorPersona, resumenPorPersona } from "@/lib/prestamos";

// ===== Auditoría de la cuenta de Sr. Luis =====

/** Revisiones automáticas sobre las consignaciones y los cuadres. */
export async function getHallazgosAuditoria(desde: string): Promise<Hallazgo[]> {
  const sb = await createClient();
  const [consig, cuadres] = await Promise.all([
    sb.from("corr_consignaciones_luis").select("id, fecha, hora, monto").gte("fecha", desde),
    sb.from("corr_cuadres").select("fecha").gte("fecha", desde),
  ]);
  const movs = consig.data ?? [];
  return ordenarHallazgos([
    ...buscarSobreTope(movs),
    ...buscarDuplicados(movs),
    ...buscarDiasSinCuadre(
      movs.map((m) => m.fecha),
      (cuadres.data ?? []).map((c) => c.fecha),
    ),
  ]);
}

/** Consignaciones de un día, solo los montos, para cruzarlas contra el grupo. */
export async function getMontosConsignados(fecha: string): Promise<number[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("corr_consignaciones_luis")
    .select("monto")
    .eq("fecha", fecha)
    .order("hora", { ascending: true, nullsFirst: false });
  return (data ?? []).map((r) => r.monto);
}
