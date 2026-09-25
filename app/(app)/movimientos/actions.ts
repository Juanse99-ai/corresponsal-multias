"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { diaEstaCerrado } from "@/lib/queries";

const addSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(["consignacion_nequi", "consignacion_bancolombia", "retiro", "recaudo"]),
  monto: z.number().int().positive(),
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  cliente: z.string().max(120).nullable().optional(),
  convenio: z.string().max(60).nullable().optional(),
});

export async function agregarMovimiento(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresa un monto válido." };

  if (session.rol !== "admin" && (await diaEstaCerrado(p.data.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }

  const sb = await createClient();
  const { error } = await sb.from("corr_movimientos").insert({
    fecha: p.data.fecha,
    tipo: p.data.tipo,
    monto: p.data.monto,
    hora: p.data.hora ?? null,
    cliente: p.data.cliente?.trim() || null,
    convenio: p.data.convenio?.trim() || null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento." };

  revalidatePath("/movimientos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function eliminarMovimiento(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (session.rol !== "admin") {
    return { ok: false, error: "Solo Juan puede borrar movimientos." };
  }
  const sb = await createClient();
  const { error } = await sb.from("corr_movimientos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  revalidatePath("/movimientos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

const editSchema = z.object({
  id: z.string().uuid(),
  tipo: z.enum(["consignacion_nequi", "consignacion_bancolombia", "retiro", "recaudo"]).optional(),
  monto: z.number().int().positive().optional(),
  cliente: z.string().max(120).nullable().optional(),
  convenio: z.string().max(60).nullable().optional(),
});

/** Corrige un movimiento (tipo / monto / cliente / convenio) sin borrarlo. */
export async function editarMovimiento(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = editSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };

  const sb = await createClient();
  const { data: row } = await sb.from("corr_movimientos").select("fecha").eq("id", p.data.id).maybeSingle();
  if (row?.fecha && session.rol !== "admin" && (await diaEstaCerrado(row.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }

  const patch: { tipo?: string; monto?: number; cliente?: string | null; convenio?: string | null } = {};
  if (p.data.tipo !== undefined) patch.tipo = p.data.tipo;
  if (p.data.monto !== undefined) patch.monto = p.data.monto;
  if (p.data.cliente !== undefined) patch.cliente = p.data.cliente?.trim() || null;
  if (p.data.convenio !== undefined) patch.convenio = p.data.convenio?.trim() || null;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await sb.from("corr_movimientos").update(patch).eq("id", p.data.id);
  if (error) return { ok: false, error: "No se pudo editar el movimiento." };

  revalidatePath("/movimientos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}
