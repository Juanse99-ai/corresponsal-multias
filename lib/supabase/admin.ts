import "server-only";
import { createClient as crearCliente, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente con la llave de servicio (salta RLS). SOLO para la clave de caja
 * (app/caja/actions.ts): leer y escribir corr_claves y corr_equipos y abrir la
 * sesión de una persona sin su contraseña. Nunca se pasa al navegador.
 * Devuelve null si falta SUPABASE_SERVICE_ROLE_KEY (variable de Vercel, sin
 * NEXT_PUBLIC): la entrada con clave queda apagada y se entra con correo.
 */
export function crearClienteAdmin(): SupabaseClient<Database> | null {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!llave) return null;
  return crearCliente<Database>(SUPABASE_URL, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
