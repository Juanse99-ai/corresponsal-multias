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
    return { ok: false, error: "Solo Juan (admin) puede borrar movimientos." };
  }
  const sb = await createClient();
  const { error } = await sb.from("corr_movimientos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  revalidatePath("/movimientos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}
