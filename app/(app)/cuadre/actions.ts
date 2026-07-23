"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireAdmin } from "@/lib/auth";
import { computeSaldoFinal } from "@/lib/cuadre";

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_tirilla: z.number().int().min(0),
  efectivo_consignaciones: z.number().int().min(0),
  retiros_cash: z.number().int().min(0),
  nequis: z.number().int().min(0),
  bancolombia: z.number().int().min(0),
  recaudos: z.number().int().min(0),
  prestamos_consignaciones: z.number().int().min(0),
  ret_real: z.number().int().min(0),
  compensado: z.number().int(),
  fondo_caja: z.number().int().min(0),
  efectivo_contado: z.number().int().min(0),
  estado: z.enum(["abierto", "cerrado"]),
  nota: z.string().max(600).nullable().optional(),
});

export interface GuardarCuadreResult {
  ok: boolean;
  error?: string;
  saldo_final?: number;
}

export async function guardarCuadre(raw: unknown): Promise<GuardarCuadreResult> {
  const session = await requireSession();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Hay datos inválidos en el cuadre." };
  const v = parsed.data;

  const sb = await createClient();

  // Anti-tamper (servidor): un dia CERRADO solo lo puede editar/reabrir un admin.
  // El candado de la pantalla no basta; aqui se rechaza de verdad.
  const { data: existente } = await sb
    .from("corr_cuadres")
    .select("estado")
    .eq("fecha", v.fecha)
    .maybeSingle();
  if (existente?.estado === "cerrado" && session.rol !== "admin") {
    return { ok: false, error: "El día está cerrado. Solo Juan puede reabrirlo para editar." };
  }

  // sr_luis autoritativo: suma de consignaciones de Luis de ese dia.
  // saldo de Luis = compensaciones - consignaciones (se arrastra como compensado).
  const [{ data: cons, error: eCons }, { data: comp, error: eComp }] = await Promise.all([
    sb.from("corr_consignaciones_luis").select("monto").eq("fecha", v.fecha),
    sb.from("corr_compensaciones_luis").select("monto").eq("fecha", v.fecha),
  ]);
  // NUNCA guardar un cuadre con componentes que no se pudieron verificar: si la
  // lectura falla, sr_luis quedaría en 0 y se persistiría un saldo final falso.
  if (eCons || eComp) {
    return {
      ok: false,
      error: "No se pudieron leer las consignaciones de Luis. No se guardó nada. Intenta de nuevo.",
    };
  }
  const sr_luis = (cons ?? []).reduce((s, r) => s + r.monto, 0);
  const compensacion_total = (comp ?? []).reduce((s, r) => s + r.monto, 0);

  const valores = {
    total_tirilla: v.total_tirilla,
    sr_luis,
    efectivo_consignaciones: v.efectivo_consignaciones,
    retiros_cash: v.retiros_cash,
    nequis: v.nequis,
    bancolombia: v.bancolombia,
    recaudos: v.recaudos,
    prestamos_consignaciones: v.prestamos_consignaciones,
    ret_real: v.ret_real,
    compensado: v.compensado,
  };
  const saldo_final = computeSaldoFinal(valores);
  const saldo_luis_cierre = compensacion_total - sr_luis;

  const { error } = await sb.from("corr_cuadres").upsert(
    {
      fecha: v.fecha,
      total_tirilla: v.total_tirilla,
      efectivo_consignaciones: v.efectivo_consignaciones,
      retiros_cash: v.retiros_cash,
      nequis: v.nequis,
      bancolombia: v.bancolombia,
      recaudos: v.recaudos,
      prestamos_consignaciones: v.prestamos_consignaciones,
      ret_real: v.ret_real,
      compensado: v.compensado,
      fondo_caja: v.fondo_caja,
      efectivo_contado: v.efectivo_contado,
      sr_luis,
      saldo_final,
      saldo_luis_cierre,
      estado: v.estado,
      nota: v.nota ?? null,
      created_by: session.id,
    },
    { onConflict: "fecha" },
  );

  if (error) return { ok: false, error: "No se pudo guardar el cuadre." };

  revalidatePath("/cuadre");
  revalidatePath("/panel");
  revalidatePath("/historial");
  revalidatePath("/luis");
  return { ok: true, saldo_final };
}

export async function eliminarCuadre(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = await createClient();
  const { error } = await sb.from("corr_cuadres").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/historial");
  revalidatePath("/panel");
  return { ok: true };
}

const SOPORTES_BUCKET = "corr-soportes";

const soporteSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  path: z.string().min(1).max(400),
  tipo: z.string().max(40).optional(),
  contexto: z.string().max(40).optional(),
  nombre: z.string().max(200).nullable().optional(),
  mime: z.string().max(120).nullable().optional(),
  tamano: z.number().int().nonnegative().nullable().optional(),
});

export async function registrarSoporte(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const p = soporteSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Soporte inválido." };

  const sb = await createClient();
  const { error } = await sb.from("corr_soportes").insert({
    fecha: p.data.fecha,
    path: p.data.path,
    tipo: p.data.tipo ?? "tirilla",
    contexto: p.data.contexto ?? "cuadre",
    nombre: p.data.nombre ?? null,
    mime: p.data.mime ?? null,
    tamano: p.data.tamano ?? null,
    created_by: session.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el soporte." };

  revalidatePath("/cuadre");
  revalidatePath("/general");
  return { ok: true };
}

export async function eliminarSoporte(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const sb = await createClient();
  const { data: row } = await sb.from("corr_soportes").select("path").eq("id", id).maybeSingle();
  if (row?.path) await sb.storage.from(SOPORTES_BUCKET).remove([row.path]);
  const { error } = await sb.from("corr_soportes").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el soporte." };

  revalidatePath("/cuadre");
  return { ok: true };
}
