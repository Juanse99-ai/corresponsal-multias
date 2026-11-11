"use server";

import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { tieneClaveCaja } from "@/lib/caja-servidor";
import { createClient } from "@/lib/supabase/server";
import { errorClaveNueva } from "@/lib/clave";

export interface NuevaClaveState {
  error: string | null;
}

/** Guarda la clave nueva de quien entró por el enlace del correo. */
export async function cambiarClaveAction(
  _prev: NuevaClaveState,
  formData: FormData,
): Promise<NuevaClaveState> {
  const clave = String(formData.get("password") ?? "");
  const repetida = String(formData.get("password2") ?? "");

  const invalida = errorClaveNueva(clave, repetida);
  if (invalida) return { error: invalida };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar?enlace=vencido");

  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) {
    if (error.code === "same_password") return { error: "La clave nueva debe ser distinta a la anterior." };
    if (error.code === "weak_password") return { error: "Esa clave es muy fácil. Prueba con una más larga." };
    return { error: "No se pudo guardar la clave. Pide un enlace nuevo." };
  }

  // Con la contraseña nueva, el administrador sigue adentro. Quien ya tiene
  // clave de caja entra con ella; quien no, sigue y la crea (layout de la app).
  const perfil = await getSessionProfile();
  if (perfil && perfil.rol !== "admin" && (await tieneClaveCaja(perfil.id))) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/caja");
  }
  redirect("/panel");
}
