import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hoyISO } from "@/lib/format";
import { textoResumen, type DatosResumen } from "@/lib/resumen-diario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resumen de las 7 a.m. para el dueño, en texto listo para WhatsApp. Lo pide
 * `openclaw/corresponsal-puente/resumen.js` desde una tarea programada de
 * OpenClaw (sin IA de por medio) y OpenClaw lo manda al chat del dueño.
 *
 * Solo lectura. Misma llave que la entrada de comprobantes:
 * `Authorization: Bearer <AGENTE_TOKEN>`. Lee del corresponsal (tablas corr_*)
 * y, del taller, solo cuántas OT siguen abiertas y cuántas completadas están
 * sin pagar (tabla `trabajos`, sin escribir en ella).
 */

function tokenValido(dado: string | null): boolean {
  const esperado = process.env.AGENTE_TOKEN;
  if (!esperado || !dado) return false;
  const a = createHash("sha256").update(dado).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

function diasAntes(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

/** Fotos pendientes que cuentan en el resumen: las de la última semana. Las más
 * viejas (hay restos de septiembre y octubre ya leídos y nunca guardados) no
 * son trabajo de hoy y repetirlas cada mañana sería ruido. */
const DIAS_FOTOS = 7;

const suma = (filas: { monto: number }[] | null) => (filas ?? []).reduce((s, f) => s + Number(f.monto), 0);

async function leerTaller(sb: SupabaseClient): Promise<DatosResumen["taller"]> {
  const { data, error } = await sb
    .from("trabajos")
    .select("estado, pagado, total, deleted")
    .or("deleted.is.null,deleted.eq.false");
  if (error || !data) {
    console.error("Resumen, taller:", error);
    return null;
  }
  const abiertas: Record<string, number> = {};
  const porCobrar = { cantidad: 0, total: 0 };
  for (const t of data as { estado: string | null; pagado: boolean | null; total: number | string | null }[]) {
    const estado = t.estado ?? "Sin estado";
    if (estado !== "Completado") {
      abiertas[estado] = (abiertas[estado] ?? 0) + 1;
    } else if (!t.pagado && Number(t.total) > 0) {
      porCobrar.cantidad++;
      porCobrar.total += Number(t.total);
    }
  }
  return { abiertas, porCobrar };
}

export async function GET(req: Request) {
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenValido(dado)) return new Response("No autorizado", { status: 401 });

  const sb = crearClienteAdmin();
  if (!sb) return new Response("Entrada apagada", { status: 503 });

  const hoy = hoyISO();
  const ayer = diasAntes(hoy, 1);

  const [cuadre, consig, comp, saldo, fotos, deudas, taller] = await Promise.all([
    sb.from("corr_cuadres").select("estado, saldo_final").eq("fecha", ayer).maybeSingle(),
    sb.from("corr_consignaciones_luis").select("monto").eq("fecha", ayer),
    sb.from("corr_compensaciones_luis").select("monto").eq("fecha", ayer),
    // Acumulado hasta ayer incluido: lo que se arrastra a hoy.
    sb.rpc("corr_saldo_luis", { p_hasta: hoy, p_incluir: false }),
    sb
      .from("corr_soportes")
      .select("id", { count: "exact", head: true })
      .in("contexto", ["luis", "luis-comp"])
      .gte("fecha", diasAntes(hoy, DIAS_FOTOS)),
    sb.rpc("corr_deudas_saldos"),
    leerTaller(sb as unknown as SupabaseClient),
  ]);

  // Sin las cifras del Sr. Luis el resumen engañaría: mejor un error que un saldo en cero.
  if (consig.error || comp.error || saldo.error) {
    console.error("Resumen, corresponsal:", consig.error ?? comp.error ?? saldo.error);
    return new Response("No se pudo leer el corresponsal", { status: 502 });
  }

  const pendientes = (deudas.data ?? [])
    .map((d) => Number(d.monto) - Number(d.abonado))
    .filter((p) => p > 0);

  const datos: DatosResumen = {
    hoy,
    ayer,
    cuadreAyer: cuadre.data ? { estado: cuadre.data.estado, saldoFinal: Number(cuadre.data.saldo_final) } : null,
    luis: {
      consignaciones: consig.data?.length ?? 0,
      totalConsignaciones: suma(consig.data),
      totalCompensaciones: suma(comp.data),
      saldo: Number(saldo.data ?? 0),
    },
    fotosPorRevisar: fotos.count ?? 0,
    prestamos: { personas: pendientes.length, total: pendientes.reduce((s, p) => s + p, 0) },
    taller,
  };

  return new Response(textoResumen(datos), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
