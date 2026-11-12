import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtCOP(n: number) {
  return "$" + Math.round(Math.abs(n)).toLocaleString("es-CO");
}

// Compara sin que el tiempo de respuesta delate cuántos caracteres acertaron.
function mismoSecreto(enviado: string, esperado: string) {
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Cuadre = { estado: string; saldo_final: number } | null;
type Sub = { endpoint: string; p256dh: string; auth: string };

/**
 * Cron de recordatorios (Vercel lo llama a las 21:55 UTC = 4:55 pm Bogotá).
 * Si el cuadre de hoy sigue abierto (o hay descuadre), envía push a todos los
 * suscriptores. No usa service-role: una función SECURITY DEFINER gateada por
 * secreto devuelve los datos.
 *
 * El secreto llega solo en la cabecera Authorization (así lo manda el cron de
 * Vercel): en la URL quedaría guardado en registros e historiales.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const cabecera = req.headers.get("authorization") ?? "";
  const enviado = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!secret || !enviado || !mismoSecreto(enviado, secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await sb.rpc("corr_cron_targets", { p_secret: secret });
  if (error || !data?.ok) {
    return NextResponse.json({ error: error?.message ?? "RPC falló" }, { status: 500 });
  }

  const cuadre = (data.cuadre ?? null) as Cuadre;
  const cerrado = cuadre?.estado === "cerrado";
  const descuadre = cuadre ? Math.round(cuadre.saldo_final) !== 0 : false;

  let title = "";
  let body = "";
  if (!cerrado) {
    title = "Cierra el cuadre de hoy";
    body = descuadre
      ? `El día sigue abierto y hay un descuadre de ${fmtCOP(cuadre!.saldo_final)}. Revísalo y ciérralo.`
      : "El día sigue abierto. Cuando tengas la tirilla, cuádralo y ciérralo.";
  } else if (descuadre) {
    title = "Descuadre del día";
    body = `El cuadre quedó con un ${cuadre!.saldo_final < 0 ? "sobrante" : "faltante"} de ${fmtCOP(
      cuadre!.saldo_final,
    )} sin justificar.`;
  } else {
    return NextResponse.json({ ok: true, enviados: 0, motivo: "todo cuadrado" });
  }

  const subs = (data.subs ?? []) as Sub[];
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: "sin suscriptores" });
  }

  webpush.setVapidDetails(
    "https://corresponsal-multias.vercel.app",
    data.vapid_public as string,
    data.vapid_private as string,
  );
  const payload = JSON.stringify({ title, body, url: "/cuadre", tag: "recordatorio-cuadre" });

  let enviados = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await sb.rpc("corr_cron_delete_sub", { p_secret: secret, p_endpoint: s.endpoint });
        }
      }
    }),
  );

  return NextResponse.json({ ok: true, enviados });
}
