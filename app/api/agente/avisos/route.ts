import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { tokenValido } from "@/lib/agente";
import { CONTEXTO_COMPENSACION, pendienteQueNoEs, type DecisionCompensacion } from "@/lib/compensacion";
import { textoPendientes, type PendienteAviso } from "@/lib/avisos-texto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Si la tarea no dice desde cuándo (la primera vez), se mira este rato hacia atrás. */
const VENTANA_INICIAL_MS = 30 * 60 * 1000;
/** Nunca más atrás que esto, aunque la tarea lleve días sin correr. */
const VENTANA_MAXIMA_MS = 24 * 60 * 60 * 1000;

/**
 * Avisos al dueño por WhatsApp (12 nov 2026, lo pidió el dueño): las fotos que
 * entraron solas desde el grupo y quedaron por revisar desde `desde`. La pide
 * `openclaw/corresponsal-puente/avisos.js` cada 15 minutos; OpenClaw manda el
 * `texto` al chat del dueño y, si viene vacío, no manda nada. El script guarda
 * `hasta` (hora del servidor) para la siguiente vuelta.
 *
 * Solo lectura. Misma llave que las otras entradas del agente
 * (`Authorization: Bearer <AGENTE_TOKEN>`). Cuenta solo lo que dejó el agente
 * (`created_by` vacío), no lo que alguien subió a mano.
 */
export async function GET(req: Request) {
  if (!tokenValido(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const sb = crearClienteAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: "Entrada apagada" }, { status: 503 });

  const ahora = Date.now();
  const pedido = Date.parse(new URL(req.url).searchParams.get("desde") ?? "");
  const desdeMs = Number.isFinite(pedido) ? Math.max(pedido, ahora - VENTANA_MAXIMA_MS) : ahora - VENTANA_INICIAL_MS;
  const hasta = new Date(ahora).toISOString();

  const { data, error } = await sb
    .from("corr_soportes")
    .select("id, fecha, contexto, datos, created_at")
    .in("contexto", ["luis", CONTEXTO_COMPENSACION])
    .is("created_by", null)
    .gt("created_at", new Date(desdeMs).toISOString())
    .lte("created_at", hasta)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Avisos del agente:", error);
    return NextResponse.json({ ok: false, error: "No se pudo leer" }, { status: 500 });
  }

  const pendientes: PendienteAviso[] = [];
  for (const s of data ?? []) {
    const d = (s.datos && typeof s.datos === "object" && !Array.isArray(s.datos) ? s.datos : {}) as Record<string, unknown>;
    if (s.contexto === CONTEXTO_COMPENSACION) {
      // Lo que la regla descarta (pedidos, contactos) no es un aviso.
      if (pendienteQueNoEs(s.datos)) continue;
      const decision = d.decision as DecisionCompensacion | undefined;
      pendientes.push({
        tipo: "compensacion",
        fecha: s.fecha,
        monto: decision && decision.suma > 0 ? decision.suma : null,
        motivo: decision?.motivo ?? "No se pudo leer la foto",
      });
    } else {
      pendientes.push({
        tipo: "comprobante",
        fecha: s.fecha,
        monto: typeof d.monto === "number" ? d.monto : null,
        motivo: typeof d.motivoRevision === "string" ? d.motivoRevision : null,
      });
    }
  }

  return NextResponse.json({ ok: true, texto: textoPendientes(pendientes), hasta });
}
