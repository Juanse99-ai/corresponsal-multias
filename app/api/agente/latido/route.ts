import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { tokenValido } from "@/lib/agente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Latido del puente de OpenClaw (lib/latido.ts): cada 5 minutos el puente
 * avisa que sigue vivo y la app guarda la hora en corr_app_config
 * (`puente_latido`). Misma llave que las otras entradas del agente. Si viene,
 * también guarda si el reintento de descarga de fotos sigue puesto en OpenClaw.
 */
export async function POST(req: Request) {
  if (!tokenValido(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const sb = crearClienteAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: "Entrada apagada" }, { status: 503 });

  const cuerpo = (await req.json().catch(() => ({}))) as { reintento?: unknown };
  const filas = [{ key: "puente_latido", value: new Date().toISOString() }];
  if (typeof cuerpo.reintento === "string" && ["puesto", "falta", "desconocido"].includes(cuerpo.reintento)) {
    filas.push({ key: "puente_reintento", value: cuerpo.reintento });
  }
  const { error } = await sb.from("corr_app_config").upsert(filas, { onConflict: "key" });
  if (error) {
    console.error("Latido del puente:", error);
    return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
