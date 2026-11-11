"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aCorreo } from "@/lib/clave";
import { getSessionProfile } from "@/lib/auth";
import { tieneClaveCaja } from "@/lib/caja-servidor";

export interface LoginState {
  error: string | null;
  /** Entró: el formulario navega a la app con el paso (lib/paso-entrar.ts). */
  listo?: boolean;
  /** A dónde va después del paso (de fábrica, el Panel). */
  destino?: string;
  /** Lo que se escribió en Usuario: con la clave mala no hay que repetirlo
   *  (React vacía el formulario al terminar la acción). */
  usuario?: string;
}

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Permite entrar con usuario (ej. "ivana") o con correo completo.
  const usuario = String(formData.get("email") ?? "");
  const email = aCorreo(usuario);
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu usuario y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Usuario o contraseña incorrectos.", usuario };
  }

  // Con correo entra el administrador siempre. Los demás, solo la primera vez:
  // enseguida crean su clave de caja y desde ahí el correo ya no les sirve.
  const perfil = await getSessionProfile();
  if (perfil && perfil.rol !== "admin") {
    const conClave = await tieneClaveCaja(perfil.id);
    if (conClave) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "Ya tienes clave de caja: entra con ella.", usuario };
    }
    if (conClave === false) return { error: null, listo: true, destino: "/crear-clave" };
  }

  return { error: null, listo: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
