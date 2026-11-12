import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Aviso = { title: string; body: string; url: string; tag: string };

/**
 * Aviso push solo a los administradores (los teléfonos con avisos activados de
 * quien tiene rol `admin`). Lo usa la entrada del agente para los comprobantes
 * que quedan por revisar.
 */
export function avisarAdmins(sb: SupabaseClient<Database>, aviso: Aviso): Promise<number> {
  return avisarRol(sb, "admin", aviso);
}

/**
 * Aviso push a las operadoras activas (12 nov 2026): les confirma lo que pasó
 * con la foto que mandaron al grupo, sin escribirles por WhatsApp desde el
 * número del dueño.
 */
export function avisarOperadoras(sb: SupabaseClient<Database>, aviso: Aviso): Promise<number> {
  return avisarRol(sb, "operador", aviso);
}

/**
 * Manda el aviso a los teléfonos con avisos activados de quien tiene ese rol.
 * Necesita el cliente con llave de servicio: las llaves VAPID y las
 * suscripciones no se leen con la sesión de nadie.
 * Nunca lanza: si el aviso falla, el comprobante igual quedó guardado o pendiente.
 */
async function avisarRol(sb: SupabaseClient<Database>, rol: "admin" | "operador", aviso: Aviso): Promise<number> {
  try {
    const { data: config } = await sb
      .from("corr_app_config")
      .select("key, value")
      .in("key", ["vapid_public", "vapid_private"]);
    const llave = (k: string) => config?.find((c) => c.key === k)?.value;
    const publica = llave("vapid_public");
    const privada = llave("vapid_private");
    if (!publica || !privada) return 0;

    const { data: personas } = await sb.from("corr_profiles").select("id").eq("rol", rol).eq("activo", true);
    const ids = (personas ?? []).map((a) => a.id);
    if (ids.length === 0) return 0;

    const { data: subs } = await sb
      .from("corr_push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .in("user_id", ids);
    if (!subs || subs.length === 0) return 0;

    webpush.setVapidDetails("https://corresponsal-multias.vercel.app", publica, privada);
    const payload = JSON.stringify(aviso);
    let enviados = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, payload);
          enviados++;
        } catch (e) {
          // Suscripción vencida: se borra para no seguir intentando.
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) await sb.from("corr_push_subscriptions").delete().eq("id", s.id);
        }
      }),
    );
    return enviados;
  } catch (e) {
    console.error(`Aviso a ${rol}:`, e);
    return 0;
  }
}
