"use server";

import { requireSession } from "@/lib/auth";
import { esRutaInterna } from "@/lib/pestanas";
import { NAV, isActive } from "@/components/shell/nav-items";
import { PAGINAS } from "./paginas";

/**
 * Pinta en el servidor la pantalla de una pestaña del computador y la devuelve
 * lista (components/shell/pestanas.tsx). Las consultas y los candados son los de
 * cada page.tsx; aquí además se exige sesión y se revisa la ruta, porque una
 * función de servidor se puede llamar con un POST directo. Sin sesión, el
 * redirect lleva a la ventana entera al login. Lo que no se puede abrir
 * devuelve null.
 */
export async function cargarPantalla(href: string): Promise<React.ReactNode> {
  const profile = await requireSession();
  if (!esRutaInterna(href)) return null;
  const url = new URL(href, "http://x");
  const Pagina = PAGINAS[url.pathname];
  const item = NAV.find((i) => isActive(url.pathname, i.href));
  if (!Pagina || !item || (item.adminOnly && profile.rol !== "admin")) return null;
  const fecha = url.searchParams.get("fecha") ?? undefined;
  return <Pagina searchParams={Promise.resolve({ fecha })} />;
}
