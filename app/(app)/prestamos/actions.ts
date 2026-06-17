"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireAdmin } from "@/lib/auth";

const deudaSchema = z.object({
  persona: z.string().trim().min(1).max(60),
  monto: z.number().int().positive(),
  concepto: z.string().max(60).nullable().optional(),
  descripcion: z.string().max(200).nullable().optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function crearDeuda(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = deudaSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Revisa la persona y el monto." };

  const sb = await createClient();
  const { error } = await sb.from("corr_deudas").insert({
    persona: p.data.persona,
    monto: p.data.monto,
    concepto: p.data.concepto?.trim() || null,
    descripcion: p.data.descripcion?.trim() || null,
    fecha: p.data.fecha,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el préstamo." };

  revalidatePath("/prestamos");
  revalidatePath("/panel");
  return { ok: true };
}

const abonoSchema = z.object({
  deuda_id: z.string().uuid(),
  monto: z.number().int().positive(),
  nota: z.string().max(200).nullable().optional(),
});

export async function agregarAbono(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = abonoSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresa un abono válido." };

  const sb = await createClient();
  const { error } = await sb.from("corr_abonos").insert({
    deuda_id: p.data.deuda_id,
    monto: p.data.monto,
    nota: p.data.nota?.trim() || null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el abono." };

  revalidatePath("/prestamos");
  revalidatePath("/panel");
  return { ok: true };
}

export async function eliminarDeuda(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = await createClient();
  const { error } = await sb.from("corr_deudas").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/prestamos");
  revalidatePath("/panel");
  return { ok: true };
}
