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

// ===== Préstamos del día (desde Movimientos) =====
const prestamoDiaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  persona: z.string().trim().min(1).max(60),
  concepto: z.string().trim().max(60).nullable().optional(),
  monto: z.number().int().positive(),
  medio: z.enum(["efectivo", "transferencia"]).optional(),
  pagado: z.boolean().optional(),
});

/** Registra un préstamo del día. Si `pagado`, lo salda de una con un abono completo. */
export async function registrarPrestamoDia(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = prestamoDiaSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Revisa la persona y el monto." };

  const sb = await createClient();
  const { data: deuda, error } = await sb
    .from("corr_deudas")
    .insert({
      persona: p.data.persona,
      monto: p.data.monto,
      concepto: p.data.concepto?.trim() || null,
      medio: p.data.medio ?? "efectivo",
      fecha: p.data.fecha,
      created_by: session.id,
    })
    .select("id")
    .single();
  if (error || !deuda) return { ok: false, error: "No se pudo registrar el préstamo." };

  if (p.data.pagado) {
    await sb.from("corr_abonos").insert({
      deuda_id: deuda.id,
      monto: p.data.monto,
      fecha: p.data.fecha,
      nota: "Devuelto el mismo día",
      created_by: session.id,
    });
  }

  revalidatePath("/movimientos");
  revalidatePath("/prestamos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}

const pagarSchema = z.object({ deuda_id: z.string().uuid(), monto: z.number().int().positive() });

/** Salda un préstamo pendiente con un abono por su saldo restante. */
export async function marcarPrestamoPagado(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = pagarSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };

  const sb = await createClient();
  const { error } = await sb.from("corr_abonos").insert({
    deuda_id: p.data.deuda_id,
    monto: p.data.monto,
    nota: "Pago registrado desde Movimientos",
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo marcar como pagado." };

  revalidatePath("/movimientos");
  revalidatePath("/prestamos");
  revalidatePath("/cuadre");
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
