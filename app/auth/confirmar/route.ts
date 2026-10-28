import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Llega desde el enlace del correo de recuperación. Cambia el código del enlace
 * por una sesión y manda a poner la clave nueva.
 *  - `code`: el flujo normal (PKCE); solo sirve en el navegador que lo pidió.
 *  - `token_hash` + `type`: por si la plantilla del correo se cambia a ese formato.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const destino = request.nextUrl.clone();
  destino.search = "";
  if (ok) {
    destino.pathname = "/nueva-clave";
  } else {
    destino.pathname = "/recuperar";
    destino.searchParams.set("enlace", "vencido");
  }
  return NextResponse.redirect(destino);
}
