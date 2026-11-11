import PanelPage from "./panel/page";
import CuadrePage from "./cuadre/page";
import MovimientosPage from "./movimientos/page";
import LuisPage from "./luis/page";
import PrestamosPage from "./prestamos/page";
import AuditoriaPage from "./auditoria/page";
import GeneralPage from "./general/page";
import HistorialPage from "./historial/page";
import BitacoraPage from "./bitacora/page";

export type Pagina = (props: { searchParams: Promise<{ fecha?: string }> }) => Promise<React.ReactNode>;

/**
 * Las pantallas que se abren en una pestaña del computador: las mismas
 * page.tsx de cada ruta. Lo usan `cargarPantalla` (pantallas.tsx) y el layout
 * de la app: que el layout las importe hace que la lista de componentes de
 * cliente de CADA ruta incluya los de todas las pantallas. Sin eso, pintar el
 * Panel en una pestaña estando en /movimientos fallaba ("Could not find the
 * module ... in the React Client Manifest") cuando el servidor recién
 * arrancaba y aún no había pintado /panel.
 */
export const PAGINAS: Record<string, Pagina> = {
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
