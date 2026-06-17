"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const generalSchema = z.object({
  fecha: z.string().regex(ISO),
  saldo_luis: z.number().int(),
  saldo_cristian: z.number().int(),
  cupo_disponible: z.number().int(),
  efectivo: z.number().int(),
  nequis: z.number().int(),
  monedas: z.number().int(),
  deudas_terceros: z.number().int(),
  nota: z.string().max(600).nullable().optional(),
});

export async function guardarGeneral(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const p = generalSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };

  const sb = await createClient();
  const { error } = await sb
    .from("corr_general")
    .upsert({ ...p.data, nota: p.data.nota ?? null, created_by: session.id }, { onConflict: "fecha" });
  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidatePath("/general");
  return { ok: true };
}

export async function eliminarGeneral(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = await createClient();
  const { error } = await sb.from("corr_general").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/general");
  return { ok: true };
}

const movSchema = z.object({
  fecha: z.string().regex(ISO),
  tipo: z.enum(["compensacion", "retiro"]),
  monto: z.number().int().positive(),
  nota: z.string().max(300).nullable().optional(),
  soporte_path: z.string().max(400).nullable().optional(),
  soporte_nombre: z.string().max(200).nullable().optional(),
});

export async function agregarMovPropio(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const p = movSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Movimiento inválido." };

  const sb = await createClient();
  const { error } = await sb.from("corr_mov_propios").insert({
    fecha: p.data.fecha,
    tipo: p.data.tipo,
    monto: p.data.monto,
    nota: p.data.nota?.trim() || null,
    soporte_path: p.data.soporte_path ?? null,
    soporte_nombre: p.data.soporte_nombre ?? null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento." };

  revalidatePath("/general");
  return { ok: true };
}

export async function eliminarMovPropio(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = await createClient();
  const { data: row } = await sb.from("corr_mov_propios").select("soporte_path").eq("id", id).maybeSingle();
  if (row?.soporte_path) await sb.storage.from("corr-soportes").remove([row.soporte_path]);
  const { error } = await sb.from("corr_mov_propios").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/general");
  return { ok: true };
}
