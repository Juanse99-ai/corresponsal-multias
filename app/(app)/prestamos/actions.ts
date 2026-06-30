"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireAdmin } from "@/lib/auth";
import { diaEstaCerrado } from "@/lib/queries";

const deudaSchema = z.object({
  persona: z.string().trim().min(1).max(60),
  monto: z.number().int().positive(),
  concepto: z.string().max(60).nullable().optional(),
  descripcion: z.string().max(200).nullable().optional(),
  medio: z.enum(["efectivo", "transferencia", "registro"]).optional(),
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
    medio: p.data.medio ?? "transferencia",
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
  medio: z.enum(["efectivo", "transferencia", "registro"]).optional(),
  pagado: z.boolean().optional(),
});

/** Registra un préstamo del día. Si `pagado`, lo salda de una con un abono completo. */
export async function registrarPrestamoDia(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = prestamoDiaSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Revisa la persona y el monto." };

  if (session.rol !== "admin" && (await diaEstaCerrado(p.data.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }

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
  const { data: dRow } = await sb.from("corr_deudas").select("fecha").eq("id", p.data.deuda_id).maybeSingle();
  if (dRow?.fecha && session.rol !== "admin" && (await diaEstaCerrado(dRow.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }
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

/** Deshace el pago de un préstamo: borra sus abonos y vuelve a quedar pendiente. */
export async function reabrirPrestamo(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Datos inválidos." };

  const sb = await createClient();
  const { data: dRow } = await sb.from("corr_deudas").select("fecha").eq("id", id).maybeSingle();
  if (dRow?.fecha && session.rol !== "admin" && (await diaEstaCerrado(dRow.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }

  const { error } = await sb.from("corr_abonos").delete().eq("deuda_id", id);
  if (error) return { ok: false, error: "No se pudo deshacer el pago." };

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

// ===== Corregir un préstamo (medio / monto / persona / concepto) sin borrarlo =====
const editarDeudaSchema = z.object({
  id: z.string().uuid(),
  persona: z.string().trim().min(1).max(60).optional(),
  concepto: z.string().trim().max(60).nullable().optional(),
  monto: z.number().int().positive().optional(),
  medio: z.enum(["efectivo", "transferencia", "registro"]).optional(),
});

export async function editarDeuda(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = editarDeudaSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Datos inválidos." };

  const sb = await createClient();
  const { data: deuda } = await sb.from("corr_deudas").select("fecha").eq("id", p.data.id).maybeSingle();
  if (deuda?.fecha && session.rol !== "admin" && (await diaEstaCerrado(deuda.fecha))) {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo." };
  }

  const patch: { persona?: string; concepto?: string | null; monto?: number; medio?: string } = {};
  if (p.data.persona !== undefined) patch.persona = p.data.persona;
  if (p.data.concepto !== undefined) patch.concepto = p.data.concepto?.trim() || null;
  if (p.data.monto !== undefined) patch.monto = p.data.monto;
  if (p.data.medio !== undefined) patch.medio = p.data.medio;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await sb.from("corr_deudas").update(patch).eq("id", p.data.id);
  if (error) return { ok: false, error: "No se pudo editar el préstamo." };

  revalidatePath("/prestamos");
  revalidatePath("/movimientos");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  return { ok: true };
}
