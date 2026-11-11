import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { COOKIE_EQUIPO, COOKIE_USO, MINUTOS_BLOQUEO } from "@/lib/caja-cookie";

// /api/cron se protege con su propio secreto (CRON_SECRET), no con sesión.
const PUBLIC_PATHS = ["/login", "/caja", "/recuperar", "/auth", "/api/cron", "/sin-acceso"];

/** Refresca la sesion y protege rutas. Se invoca desde proxy.ts. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no metas logica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // En un equipo autorizado se entra con la clave de caja; en otro, con correo.
    url.pathname = request.cookies.has(COOKIE_EQUIPO) ? "/caja" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // En un equipo de caja la sesión no sobrevive a MINUTOS_BLOQUEO sin uso,
  // aunque se haya cerrado la pestaña en vez de bloquear: se cierra aquí (solo
  // en este navegador) y se vuelve a la pantalla de clave. Cada petición con
  // la app abierta renueva la hora.
  if (user && !isPublic && request.cookies.has(COOKIE_EQUIPO)) {
    const ultimo = Number(request.cookies.get(COOKIE_USO)?.value ?? 0);
    const ahora = Date.now();
    if (ultimo > 0 && ahora - ultimo > MINUTOS_BLOQUEO * 60_000) {
      await supabase.auth.signOut({ scope: "local" });
      const url = request.nextUrl.clone();
      url.pathname = "/caja";
      url.search = "";
      // 303: si venía un formulario (POST), se sigue con GET y no se reenvía.
      const r = NextResponse.redirect(url, 303);
      // Las cookies de la sesión ya cerrada viajan con el redirect.
      supabaseResponse.cookies.getAll().forEach((c) => r.cookies.set(c));
      r.cookies.delete(COOKIE_USO);
      return r;
    }
    supabaseResponse.cookies.set(COOKIE_USO, String(ahora), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 60 * 60,
    });
  }

  if (user && (path === "/login" || path === "/caja")) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
