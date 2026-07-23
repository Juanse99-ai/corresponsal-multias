import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/cuadre";

export interface SessionProfile {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

/**
 * Perfil de la sesion actual, o null si no hay acceso.
 * Devuelve null si no hay sesion, si el usuario NO tiene perfil del corresponsal
 * (el pool auth es compartido con el taller) o si su perfil esta inactivo.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("corr_profiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  // Sin perfil del corresponsal o dado de baja => sin acceso a esta app.
  if (!profile || profile.activo === false) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: profile.nombre ?? user.email?.split("@")[0] ?? "Usuario",
    rol: (profile.rol as Rol) ?? "operador",
  };
}

/**
 * Exige acceso al corresponsal. Sin sesion -> /login. Con sesion de auth pero
 * sin perfil del corresponsal (o inactivo) -> /sin-acceso (evita el bucle con
 * el redirect de /login del proxy, que rebota a los usuarios autenticados).
 */
export async function requireSession(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (profile) return profile;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/sin-acceso" : "/login");
}

/** Exige rol admin; redirige al panel si es operador. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireSession();
  if (profile.rol !== "admin") redirect("/panel");
  return profile;
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
