"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aCorreo } from "@/lib/clave";

export interface LoginState {
  error: string | null;
}

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Permite entrar con usuario (ej. "ivana") o con correo completo.
  const email = aCorreo(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu usuario y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  redirect("/panel");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
