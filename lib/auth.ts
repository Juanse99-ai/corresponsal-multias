import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/cuadre";

export interface SessionProfile {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

/** Perfil de la sesion actual, o null si no hay sesion. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("corr_profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: profile?.nombre ?? user.email?.split("@")[0] ?? "Usuario",
    rol: (profile?.rol as Rol) ?? "operador",
  };
}

/** Exige sesion; redirige a /login si no hay. */
export async function requireSession(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
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
