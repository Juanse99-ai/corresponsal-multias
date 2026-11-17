import "server-only";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { avisarAdmins, avisarOperadoras } from "@/lib/avisos";
import { decidirLatido } from "@/lib/latido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const igual = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

const horaDe = (ms: number) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(new Date(ms)));

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/**
 * Vigía del puente (lib/latido.ts). La llama cada 5 minutos un pg_cron de
 * Supabase (migración 20261117120000_corr_latido_puente) con el secreto del
 * cron (`corr_app_config.cron_secret`) en Authorization. Si el puente lleva
 * más de 15 minutos sin latido en horario de trabajo, avisa a admins y
 * operadoras con una notificación de la app; cuando vuelve, avisa que volvió.
 */
export async function GET(req: Request) {
  const sb = crearClienteAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: "Entrada apagada" }, { status: 503 });

  const { data: config } = await sb
    .from("corr_app_config")
    .select("key, value")
    .in("key", ["cron_secret", "puente_latido", "puente_caido_avisado"]);
  const valor = (k: string) => config?.find((c) => c.key === k)?.value ?? "";
  const cabecera = req.headers.get("authorization") ?? "";
  const enviado = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  const secreto = valor("cron_secret");
  if (!secreto || !enviado || !igual(enviado, secreto)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ultimo = valor("puente_latido") || null;
  const avisado = valor("puente_caido_avisado");
  const ahora = Date.now();
  const decision = decidirLatido(ultimo, avisado, ahora, horaDe(ahora));

  if (decision === "avisar_caido" && ultimo) {
    const aviso = {
      title: "El puente de WhatsApp no responde",
      body: `Desde las ${hhmm(ultimo)} no entran solas las fotos del grupo. Revisa que el Mac esté prendido, con internet y OpenClaw abierto. Mientras tanto, súbelas a mano.`,
      url: "/luis",
      tag: "puente-caido",
    };
    await Promise.all([avisarAdmins(sb, aviso), avisarOperadoras(sb, aviso)]);
    await sb.from("corr_app_config").upsert({ key: "puente_caido_avisado", value: ultimo }, { onConflict: "key" });
  } else if (decision === "avisar_volvio") {
    const aviso = {
      title: "El puente de WhatsApp volvió",
      body: "Las fotos del grupo vuelven a entrar solas. Revisa que no falte ninguna de mientras estuvo caído.",
      url: "/luis",
      tag: "puente-caido",
    };
    await Promise.all([avisarAdmins(sb, aviso), avisarOperadoras(sb, aviso)]);
    await sb.from("corr_app_config").upsert({ key: "puente_caido_avisado", value: "" }, { onConflict: "key" });
  }
  return NextResponse.json({ ok: true, decision, ultimo });
}
