"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aCorreo } from "@/lib/clave";

export interface LoginState {
  error: string | null;
  /** Entró: el formulario navega a la app con el paso (lib/paso-entrar.ts). */
  listo?: boolean;
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

  return { error: null, listo: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
