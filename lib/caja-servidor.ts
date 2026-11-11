import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/caja";
import { COOKIE_EQUIPO } from "@/lib/caja-cookie";

type Admin = SupabaseClient<Database>;
export type Equipo = Database["public"]["Tables"]["corr_equipos"]["Row"];

/** El equipo autorizado de esta petición (por su cookie), o null. */
export async function equipoDeCookie(admin: Admin): Promise<Equipo | null> {
  const token = (await cookies()).get(COOKIE_EQUIPO)?.value;
  if (!token) return null;
  const { data } = await admin
    .from("corr_equipos")
    .select("*")
    .eq("token_hash", hashToken(token))
    .eq("activo", true)
    .maybeSingle();
  return data ?? null;
}

/** ¿Este equipo trae la cookie de autorizado? (sin ir a la base; para decidir el bloqueo por inactividad). */
export async function tieneCookieEquipo(): Promise<boolean> {
  return (await cookies()).has(COOKIE_EQUIPO);
}

/** ¿La persona ya tiene clave de caja? null si la clave está apagada (sin llave de servicio). */
export async function tieneClaveCaja(userId: string): Promise<boolean | null> {
  const admin = crearClienteAdmin();
  if (!admin) return null;
  const { data } = await admin.from("corr_claves").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export interface PersonaCaja {
  id: string;
  nombre: string;
  /** false: es su primera vez en la caja y tiene que crear la clave. */
  tieneClave: boolean;
}

/**
 * Lo que necesita la pantalla /caja: si la clave de caja está configurada
 * (llave de servicio), el nombre del equipo si está autorizado, y todas las
 * personas activas, con o sin clave (las que no tienen la crean la primera vez).
 */
export async function datosCaja(): Promise<{ listo: boolean; equipo: string | null; personas: PersonaCaja[] }> {
  const admin = crearClienteAdmin();
  if (!admin) return { listo: false, equipo: null, personas: [] };
  const equipo = await equipoDeCookie(admin);
  if (!equipo) return { listo: true, equipo: null, personas: [] };

  const [{ data: perfiles }, { data: claves }] = await Promise.all([
    admin.from("corr_profiles").select("id, nombre, activo"),
    admin.from("corr_claves").select("user_id"),
  ]);
  const conClave = new Set((claves ?? []).map((c) => c.user_id));
  const personas = (perfiles ?? [])
    .filter((p) => p.activo !== false)
    .map((p) => ({ id: p.id, nombre: p.nombre || "Usuario", tieneClave: conClave.has(p.id) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { listo: true, equipo: equipo.nombre, personas };
}
