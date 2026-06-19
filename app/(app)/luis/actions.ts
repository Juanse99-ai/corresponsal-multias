"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";

const addSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto: z.number().int().positive(),
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  nota: z.string().max(200).nullable().optional(),
});

export async function agregarConsignacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = addSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresa un monto válido." };

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
  await requireSession();
  const sb = await createClient();
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
  await requireSession();
  const sb = await createClient();
  const { error } = await sb.from("corr_compensaciones_luis").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

// ===== Corregir (monto / hora / nota) sin borrar =====
const editLuisSchema = z.object({
  id: z.string().uuid(),
  monto: z.number().int().positive().optional(),
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  nota: z.string().max(200).nullable().optional(),
});

function patchLuis(p: z.infer<typeof editLuisSchema>): { monto?: number; hora?: string | null; nota?: string | null } {
  const patch: { monto?: number; hora?: string | null; nota?: string | null } = {};
  if (p.monto !== undefined) patch.monto = p.monto;
  if (p.hora !== undefined) patch.hora = p.hora ?? null;
  if (p.nota !== undefined) patch.nota = p.nota?.trim() || null;
  return patch;
}

export async function editarConsignacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const p = editLuisSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };
  const patch = patchLuis(p.data);
  if (Object.keys(patch).length === 0) return { ok: true };

  const sb = await createClient();
  const { error } = await sb.from("corr_consignaciones_luis").update(patch).eq("id", p.data.id);
  if (error) return { ok: false, error: "No se pudo editar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

export async function editarCompensacion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const p = editLuisSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };
  const patch = patchLuis(p.data);
  if (Object.keys(patch).length === 0) return { ok: true };

  const sb = await createClient();
  const { error } = await sb.from("corr_compensaciones_luis").update(patch).eq("id", p.data.id);
  if (error) return { ok: false, error: "No se pudo editar." };

  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}
