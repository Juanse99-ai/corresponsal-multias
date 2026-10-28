"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aCorreo } from "@/lib/clave";

export interface RecuperarState {
  error: string | null;
  enviado: boolean;
}

/** Manda el correo con el enlace para poner una clave nueva. */
export async function pedirRecuperacionAction(
  _prev: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = aCorreo(String(formData.get("email") ?? ""));
  if (!email) return { error: "Escribe tu usuario o tu correo.", enviado: false };

  // El enlace vuelve a este mismo dominio (local o producción). Supabase solo lo
  // acepta si está en su lista de Redirect URLs; si no, manda al Site URL.
  const h = await headers();
  const origen = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origen}/auth/confirmar`,
  });

  if (error?.status === 429) {
    return { error: "Ya se pidieron varios enlaces. Espera unos minutos y vuelve a intentar.", enviado: false };
  }
  // Cualquier otro caso responde igual, exista o no la cuenta: así nadie puede
  // averiguar qué correos están registrados.
  return { error: null, enviado: true };
}
