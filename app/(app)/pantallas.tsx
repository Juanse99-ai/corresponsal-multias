"use server";

import { requireSession } from "@/lib/auth";
import { esRutaInterna } from "@/lib/pestanas";
import { NAV, isActive } from "@/components/shell/nav-items";
import PanelPage from "./panel/page";
import CuadrePage from "./cuadre/page";
import MovimientosPage from "./movimientos/page";
import LuisPage from "./luis/page";
import PrestamosPage from "./prestamos/page";
import AuditoriaPage from "./auditoria/page";
import GeneralPage from "./general/page";
import HistorialPage from "./historial/page";
import BitacoraPage from "./bitacora/page";

type Pagina = (props: { searchParams: Promise<{ fecha?: string }> }) => Promise<React.ReactNode>;

/** Las pantallas que se abren en una pestaña: las mismas page.tsx de cada ruta. */
const PAGINAS: Record<string, Pagina> = {
  "/panel": PanelPage,
  "/cuadre": CuadrePage,
  "/movimientos": MovimientosPage,
  "/luis": LuisPage,
  "/prestamos": PrestamosPage,
  "/auditoria": AuditoriaPage,
  "/general": GeneralPage,
  "/historial": HistorialPage,
  "/bitacora": BitacoraPage,
};

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
