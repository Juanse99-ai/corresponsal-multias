import { crearClienteAdmin } from "@/lib/supabase/admin";
import { tokenValido } from "@/lib/agente";
import { hoyISO } from "@/lib/format";
import { textoCierre } from "@/lib/avisos-texto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recordatorio de cierre por WhatsApp (12 nov 2026, lo pidió el dueño): a las
 * 4:55 p. m. `openclaw/corresponsal-puente/cierre.js` pide este texto y
 * OpenClaw lo manda al chat del dueño. Si el día ya está cerrado y cuadrado
 * responde vacío y no se manda nada. Es el mismo aviso que llega al navegador
 * (app/api/cron/recordatorios), con el texto de lib/avisos-texto.ts.
 *
 * Solo lectura, misma llave que las otras entradas del agente.
 */
export async function GET(req: Request) {
  if (!tokenValido(req)) return new Response("No autorizado", { status: 401 });
  const sb = crearClienteAdmin();
  if (!sb) return new Response("Entrada apagada", { status: 503 });

  const hoy = hoyISO();
  const { data: cuadre, error } = await sb.from("corr_cuadres").select("estado, saldo_final").eq("fecha", hoy).maybeSingle();
  if (error) {
    console.error("Cierre del agente:", error);
    return new Response("No se pudo leer el cuadre", { status: 500 });
  }
  return new Response(textoCierre(cuadre, hoy), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
