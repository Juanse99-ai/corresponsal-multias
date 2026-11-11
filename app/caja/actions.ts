"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requireAdmin, requireSession } from "@/lib/auth";
import { equipoDeCookie } from "@/lib/caja-servidor";
import { COOKIE_EQUIPO, COOKIE_USO } from "@/lib/caja-cookie";
import {
  DURACION_EQUIPO_S,
  errorClaveNueva,
  hashToken,
  mensajeVerificacion,
  minutosRestantes,
  tokenEquipo,
} from "@/lib/caja";

const SIN_SERVICIO = "La clave de caja no está configurada. Entra con tu correo.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Resultado {
  ok: boolean;
  error?: string;
}

/**
 * Entrar con la clave de caja. Solo desde un equipo autorizado (cookie). Con la
 * clave buena abre la sesión de esa persona sin su contraseña: el servidor pide
 * un enlace de entrada (sin enviar correo) y lo usa en el acto, así la sesión
 * queda en las cookies de este navegador como si hubiera entrado con correo.
 */
export async function entrarConClave(userId: string, clave: string): Promise<Resultado> {
  if (typeof userId !== "string" || !UUID.test(userId) || typeof clave !== "string" || !/^\d{6}$/.test(clave)) {
    return { ok: false, error: "Clave inválida." };
  }
  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: SIN_SERVICIO };
  const token = (await cookies()).get(COOKIE_EQUIPO)?.value;
  if (!token) return { ok: false, error: "Este equipo no está autorizado." };

  // Equipo, bloqueo, clave y cuenta de intentos: todo en una función de
  // Postgres que bloquea las filas mientras revisa (0005_caja_clave_funciones.sql).
  const { data: r, error: errorVerificar } = await admin.rpc("corr_caja_verificar", {
    p_equipo_hash: hashToken(token),
    p_user: userId,
    p_clave: clave,
  });
  if (errorVerificar || !r) {
    console.error("Clave de caja, verificar:", errorVerificar);
    return { ok: false, error: "No se pudo revisar la clave." };
  }
  const mensaje = mensajeVerificacion(r as { ok?: boolean; motivo?: string; quedan?: number; hasta?: string | null });
  if (mensaje) return { ok: false, error: mensaje };

  const { data: perfil } = await admin.from("corr_profiles").select("activo").eq("id", userId).maybeSingle();
  if (!perfil || perfil.activo === false) return { ok: false, error: "Esa persona no tiene acceso." };

  const { data: usuario } = await admin.auth.admin.getUserById(userId);
  const email = usuario?.user?.email;
  if (!email) return { ok: false, error: "No se pudo abrir la sesión." };
  const { data: enlace, error: errorEnlace } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = enlace?.properties?.hashed_token;
  if (errorEnlace || !tokenHash) {
    console.error("Clave de caja, enlace:", errorEnlace);
    return { ok: false, error: "No se pudo abrir la sesión." };
  }
  const supabase = await createClient();
  // "magiclink" es el tipo del enlace; las versiones nuevas de Supabase Auth
  // también lo aceptan como "email". Se prueba uno y, si no, el otro.
  let { error: errorSesion } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (errorSesion) ({ error: errorSesion } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash }));
  if (errorSesion) {
    console.error("Clave de caja, sesión:", errorSesion);
    return { ok: false, error: "No se pudo abrir la sesión." };
  }

  // Desde ya cuenta el tiempo sin uso (el proxy cierra la sesión pasados 10 min).
  (await cookies()).set(COOKIE_USO, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_EQUIPO_S,
  });
  return { ok: true };
}

/**
 * Bloquear: cierra la sesión SOLO en este navegador (scope local; cerrar sesión
 * normal la cierra en todos lados) y vuelve a la pantalla de clave.
 */
export async function bloquear(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/caja");
}

// ===== Ajustes de la clave (ventana "Clave de caja") =====

export interface EstadoCaja {
  /** La llave de servicio está puesta en el servidor. */
  listo: boolean;
  tengoClave: boolean;
  /** Este navegador es un equipo autorizado. */
  equipo: string | null;
  esAdmin: boolean;
  /** Solo para admin. */
  equipos?: { id: string; nombre: string; ultimoUso: string | null; actual: boolean }[];
  /** bloqueadaMin: -1 si está bloqueada hasta que el admin la borre. */
  personas?: { id: string; nombre: string; tieneClave: boolean; bloqueadaMin: number }[];
}

export async function estadoCaja(): Promise<EstadoCaja> {
  const perfil = await requireSession();
  const esAdmin = perfil.rol === "admin";
  const admin = crearClienteAdmin();
  if (!admin) return { listo: false, tengoClave: false, equipo: null, esAdmin };

  const [{ data: mia }, equipo] = await Promise.all([
    admin.from("corr_claves").select("user_id").eq("user_id", perfil.id).maybeSingle(),
    equipoDeCookie(admin),
  ]);
  const estado: EstadoCaja = { listo: true, tengoClave: !!mia, equipo: equipo?.nombre ?? null, esAdmin };
  if (!esAdmin) return estado;

  const [{ data: equipos }, { data: perfiles }, { data: claves }] = await Promise.all([
    admin.from("corr_equipos").select("id, nombre, ultimo_uso").eq("activo", true).order("creado"),
    admin.from("corr_profiles").select("id, nombre, activo").order("nombre"),
    admin.from("corr_claves").select("user_id, bloqueada_hasta"),
  ]);
  const porId = new Map((claves ?? []).map((c) => [c.user_id, c]));
  estado.equipos = (equipos ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    ultimoUso: e.ultimo_uso,
    actual: e.id === equipo?.id,
  }));
  estado.personas = (perfiles ?? [])
    .filter((p) => p.activo !== false)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre || "Usuario",
      tieneClave: porId.has(p.id),
      bloqueadaMin:
        porId.get(p.id)?.bloqueada_hasta === "infinity" ? -1 : minutosRestantes(porId.get(p.id)?.bloqueada_hasta),
    }));
  return estado;
}

/**
 * Pone o cambia la clave de quien tiene la sesión. Si ya tiene una, pide la
 * actual (en Postgres, y las malas cuentan para el bloqueo): quien encuentre
 * abierta la sesión de otro no se la puede cambiar.
 */
export async function guardarMiClave(actual: string, nueva: string): Promise<Resultado> {
  const perfil = await requireSession();
  const error = errorClaveNueva(String(nueva ?? ""));
  if (error) return { ok: false, error };
  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: SIN_SERVICIO };
  const { data: r, error: e } = await admin.rpc("corr_caja_cambiar_clave", {
    p_user: perfil.id,
    p_actual: String(actual ?? ""),
    p_nueva: nueva,
  });
  if (e || !r) return { ok: false, error: "No se pudo guardar la clave." };
  const mensaje = mensajeVerificacion(r as { ok?: boolean; motivo?: string; quedan?: number; hasta?: string | null });
  return mensaje ? { ok: false, error: mensaje } : { ok: true };
}

/** Admin: borra la clave de alguien (la olvidó o quedó bloqueada); la vuelve a poner esa persona. */
export async function quitarClave(userId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(String(userId))) return { ok: false, error: "Persona inválida." };
  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: SIN_SERVICIO };
  const { error } = await admin.from("corr_claves").delete().eq("user_id", userId);
  return error ? { ok: false, error: "No se pudo quitar." } : { ok: true };
}

/** Admin: autoriza ESTE navegador como equipo de caja (cookie httpOnly de 400 días). */
export async function autorizarEquipo(nombre: string): Promise<Resultado> {
  const perfil = await requireAdmin();
  const limpio = String(nombre ?? "").trim().slice(0, 40);
  if (!limpio) return { ok: false, error: "Ponle un nombre al equipo." };
  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: SIN_SERVICIO };

  // Si ya tenía uno, el viejo deja de servir.
  const anterior = await equipoDeCookie(admin);
  if (anterior) await admin.from("corr_equipos").update({ activo: false }).eq("id", anterior.id);

  const { token, hash } = tokenEquipo();
  const { error } = await admin.from("corr_equipos").insert({ token_hash: hash, nombre: limpio, autorizado_por: perfil.id });
  if (error) return { ok: false, error: "No se pudo autorizar." };
  (await cookies()).set(COOKIE_EQUIPO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_EQUIPO_S,
  });
  return { ok: true };
}

/** Admin: quita la autorización de un equipo (perdido, cambiado). */
export async function quitarEquipo(id: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(String(id))) return { ok: false, error: "Equipo inválido." };
  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: SIN_SERVICIO };
  const { error } = await admin.from("corr_equipos").update({ activo: false }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo quitar." };
  // Si es este mismo navegador, se le borra la cookie.
  const jar = await cookies();
  const token = jar.get(COOKIE_EQUIPO)?.value;
  if (token) {
    const { data } = await admin.from("corr_equipos").select("id").eq("token_hash", hashToken(token)).maybeSingle();
    if (data?.id === id) jar.delete(COOKIE_EQUIPO);
  }
  return { ok: true };
}
