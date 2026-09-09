"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { diaEstaCerrado, SOPORTES_BUCKET } from "@/lib/queries";
import {
  leerComprobante,
  lecturaDisponible,
  comprobanteSchema,
  type Comprobante,
} from "@/lib/leer-comprobante";

const CERRADO = "El día está cerrado. Solo Juan puede reabrirlo para editar.";

/** True si un operador intenta tocar un día ya cerrado (el admin sí puede). */
async function diaBloqueado(rol: string, fecha: string): Promise<boolean> {
  return rol !== "admin" && (await diaEstaCerrado(fecha));
}

/**
 * Hora del movimiento. Se aceptan segundos porque así los devuelve Postgres
 * ("09:27:00") y es fácil que vuelvan tal cual desde un formulario de edición;
 * se recortan antes de guardar.
 */
const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  .transform((h) => h.slice(0, 5))
  .nullable()
  .optional();

const addSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto: z.number().int().positive(),
  hora: horaSchema,
  nota: z.string().max(200).nullable().optional(),
});

export async function agregarConsignacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresa un monto válido." };
  if (await diaBloqueado(session.rol, p.data.fecha)) return { ok: false, error: CERRADO };

  const sb = await createClient();
  const { error } = await sb.from("corr_consignaciones_luis").insert({
    fecha: p.data.fecha,
    monto: p.data.monto,
    hora: p.data.hora ?? null,
    nota: p.data.nota?.trim() || null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar la consignación." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function eliminarConsignacion(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const sb = await createClient();
  const { data: row } = await sb.from("corr_consignaciones_luis").select("fecha").eq("id", id).maybeSingle();
  if (row?.fecha && (await diaBloqueado(session.rol, row.fecha))) return { ok: false, error: CERRADO };
  const { error } = await sb.from("corr_consignaciones_luis").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function agregarCompensacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresa un monto válido." };
  if (await diaBloqueado(session.rol, p.data.fecha)) return { ok: false, error: CERRADO };

  const sb = await createClient();
  const { error } = await sb.from("corr_compensaciones_luis").insert({
    fecha: p.data.fecha,
    monto: p.data.monto,
    hora: p.data.hora ?? null,
    nota: p.data.nota?.trim() || null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar la compensación." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function eliminarCompensacion(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const sb = await createClient();
  const { data: row } = await sb.from("corr_compensaciones_luis").select("fecha").eq("id", id).maybeSingle();
  if (row?.fecha && (await diaBloqueado(session.rol, row.fecha))) return { ok: false, error: CERRADO };
  const { error } = await sb.from("corr_compensaciones_luis").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

// ===== Por lote: el chat que Luis manda por WhatsApp, ya leído y revisado =====
// El chat es un grupo y trae varios días, así que cada movimiento viaja con su
// propia fecha; `fecha` es solo el día abierto, para los que no traen encabezado.
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const loteSchema = z.object({
  fecha: z.string().regex(ISO),
  items: z
    .array(
      z.object({
        fecha: z.string().regex(ISO).optional(),
        monto: z.number().int().positive(),
        hora: horaSchema,
        nota: z.string().max(200).nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export interface ResultadoLote {
  ok: boolean;
  error?: string;
  insertados?: number;
  /** Los que ya estaban guardados con el mismo día, monto y hora. */
  repetidos?: number;
  /** Cuántos días distintos recibieron movimientos. */
  dias?: number;
}

async function agregarLote(
  tabla: "corr_consignaciones_luis" | "corr_compensaciones_luis",
  raw: unknown,
): Promise<ResultadoLote> {
  const session = await requireSession();
  const p = loteSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "La lista trae un monto que no se entiende." };

  const items = p.data.items.map((it) => ({ ...it, fecha: it.fecha ?? p.data.fecha }));
  const fechas = [...new Set(items.map((it) => it.fecha))];

  // Un día cerrado bloquea todo el lote: es más claro que guardar a medias.
  for (const f of fechas) {
    if (await diaBloqueado(session.rol, f)) {
      return { ok: false, error: `${CERRADO} (${f})` };
    }
  }

  const sb = await createClient();

  // Descartar lo que ya está: mismo día, monto y hora. Es la única defensa si
  // se sube el mismo chat exportado dos veces.
  const { data: existentes } = await sb.from(tabla).select("fecha, monto, hora").in("fecha", fechas);
  const clave = (f: string, monto: number, hora: string | null) => `${f}|${monto}|${(hora ?? "").slice(0, 5)}`;
  const yaEstan = new Set((existentes ?? []).map((r) => clave(r.fecha, r.monto, r.hora)));

  const filas: {
    fecha: string;
    monto: number;
    hora: string | null;
    nota: string | null;
    created_by: string;
  }[] = [];
  for (const it of items) {
    const k = clave(it.fecha, it.monto, it.hora ?? null);
    if (yaEstan.has(k)) continue;
    yaEstan.add(k); // dos idénticos dentro del mismo lote tampoco se duplican
    filas.push({
      fecha: it.fecha,
      monto: it.monto,
      hora: it.hora ?? null,
      nota: it.nota?.trim() || null,
      created_by: session.id,
    });
  }

  const repetidos = items.length - filas.length;
  if (filas.length === 0) return { ok: true, insertados: 0, repetidos, dias: 0 };

  // Un solo insert: o entran todos o no entra ninguno.
  const { error, data } = await sb.from(tabla).insert(filas).select("id");
  if (error) return { ok: false, error: "No se pudieron guardar los movimientos." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  revalidatePath("/historial");
  return {
    ok: true,
    insertados: data?.length ?? filas.length,
    repetidos,
    dias: new Set(filas.map((f) => f.fecha)).size,
  };
}

export async function agregarConsignacionesLote(raw: unknown) {
  return agregarLote("corr_consignaciones_luis", raw);
}

export async function agregarCompensacionesLote(raw: unknown) {
  return agregarLote("corr_compensaciones_luis", raw);
}

// ===== Leer los montos de las fotos de los comprobantes =====
export interface ComprobanteLeido {
  soporteId: string;
  nombre: string | null;
  monto: number | null;
  fecha: string | null;
  hora: string | null;
  transaccion: string | null;
  titular: string | null;
  destino: string | null;
  recibo: string | null;
  seguro: boolean;
  esComprobante: boolean;
  error?: string;
}

/** Cuántas fotos se leen a la vez. */
const LECTURAS_EN_PARALELO = 3;

/**
 * Lee las tirillas del día que todavía no se han leído y guarda el resultado
 * en el soporte, para no volver a pagar la misma imagen. No guarda ningún
 * movimiento: eso lo decide el usuario en la revisión.
 */
export async function leerComprobantesDelDia(
  fecha: string,
): Promise<{ ok: boolean; error?: string; items?: ComprobanteLeido[] }> {
  await requireSession();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Fecha inválida." };
  if (!lecturaDisponible()) {
    return { ok: false, error: "Falta configurar la llave de lectura (ANTHROPIC_API_KEY)." };
  }

  const sb = await createClient();
  const { data: soportes } = await sb
    .from("corr_soportes")
    .select("id, path, nombre, mime, datos")
    .eq("fecha", fecha)
    .eq("contexto", "luis")
    .order("created_at", { ascending: true });

  if (!soportes || soportes.length === 0) {
    return { ok: false, error: "No hay fotos de comprobantes en este día." };
  }

  const salida: ComprobanteLeido[] = new Array(soportes.length);

  const deDatos = (id: string, nombre: string | null, d: Comprobante): ComprobanteLeido => ({
    soporteId: id,
    nombre,
    monto: d.monto,
    fecha: d.fecha,
    hora: d.hora,
    transaccion: d.transaccion,
    titular: d.titular,
    destino: d.destino,
    recibo: d.recibo,
    seguro: d.seguro,
    esComprobante: d.es_comprobante });

  const cola = soportes.map((s, i) => ({ s, i }));
  async function trabajador() {
    for (;;) {
      const item = cola.shift();
      if (!item) return;
      const { s, i } = item;

      // Ya leída antes: se reusa y no se vuelve a cobrar.
      const cacheada = comprobanteSchema.safeParse(s.datos);
      if (cacheada.success) {
        salida[i] = deDatos(s.id, s.nombre, cacheada.data);
        continue;
      }

      try {
        const { data: archivo, error } = await sb.storage.from(SOPORTES_BUCKET).download(s.path);
        if (error || !archivo) throw new Error("No se pudo abrir la foto.");
        const buffer = Buffer.from(await archivo.arrayBuffer());
        const leido = await leerComprobante(buffer, s.mime || archivo.type || "image/jpeg");
        await sb.from("corr_soportes").update({ datos: leido }).eq("id", s.id);
        salida[i] = deDatos(s.id, s.nombre, leido);
      } catch (e) {
        salida[i] = {
          soporteId: s.id,
          nombre: s.nombre,
          monto: null,
          fecha: null,
          hora: null,
          transaccion: null,
          titular: null,
          destino: null,
          recibo: null,
          seguro: false,
          esComprobante: false,
          error: e instanceof Error ? e.message : "No se pudo leer.",
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(LECTURAS_EN_PARALELO, soportes.length) }, trabajador),
  );

  return { ok: true, items: salida };
}

// ===== Corregir (monto / hora / nota) sin borrar =====
const editLuisSchema = z.object({
  id: z.string().uuid(),
  monto: z.number().int().positive().optional(),
  hora: horaSchema,
  nota: z.string().max(200).nullable().optional(),
});

function patchLuis(p: z.infer<typeof editLuisSchema>): { monto?: number; hora?: string | null; nota?: string | null } {
  const patch: { monto?: number; hora?: string | null; nota?: string | null } = {};
  if (p.monto !== undefined) patch.monto = p.monto;
  if (p.hora !== undefined) patch.hora = p.hora ?? null;
  if (p.nota !== undefined) patch.nota = p.nota?.trim() || null;
  return patch;
}

async function editarLuis(
  tabla: "corr_consignaciones_luis" | "corr_compensaciones_luis",
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = editLuisSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };
  const patch = patchLuis(p.data);
  if (Object.keys(patch).length === 0) return { ok: true };

  const sb = await createClient();
  const { data: row } = await sb.from(tabla).select("fecha").eq("id", p.data.id).maybeSingle();
  if (row?.fecha && (await diaBloqueado(session.rol, row.fecha))) return { ok: false, error: CERRADO };

  const { error } = await sb.from(tabla).update(patch).eq("id", p.data.id);
  if (error) return { ok: false, error: "No se pudo editar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function editarConsignacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  return editarLuis("corr_consignaciones_luis", raw);
}

export async function editarCompensacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  return editarLuis("corr_compensaciones_luis", raw);
}
