"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GRUPOS, NAV, isActive } from "@/components/shell/nav-items";
import { NavegacionCtx, type Navegacion } from "@/lib/use-navegacion";
import { hoyISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MAX_PESTANAS,
  activar,
  cerrar as cerrarPestana,
  esRutaInterna,
  irA,
  normalizar,
  paraGuardar,
  pestanaActiva,
  pestanasIniciales,
  restaurar,
  rutaDe,
  tituloDe,
  type EstadoPestanas,
} from "@/lib/pestanas";
import { cargarPantalla } from "@/app/(app)/pantallas";
import CargaPanel from "@/app/(app)/panel/loading";
import CargaCuadre from "@/app/(app)/cuadre/loading";
import CargaMovimientos from "@/app/(app)/movimientos/loading";
import CargaLuis from "@/app/(app)/luis/loading";
import CargaPrestamos from "@/app/(app)/prestamos/loading";
import CargaAuditoria from "@/app/(app)/auditoria/loading";
import CargaGeneral from "@/app/(app)/general/loading";
import CargaHistorial from "@/app/(app)/historial/loading";
import CargaBitacora from "@/app/(app)/bitacora/loading";

/**
 * Pestañas del computador, como en Biela: varias pantallas abiertas a la vez,
 * cada una donde se dejó. Sin iframes: todas las pantallas abiertas quedan
 * montadas en este mismo árbol y solo se ve la de adelante. Cada una la pinta
 * el servidor (cargarPantalla) con la misma page.tsx de su ruta; al refrescar,
 * React compara y conserva lo escrito. La URL sigue a la de adelante con
 * history.replaceState, que Next acepta sin desmontar nada. Las reglas (abrir,
 * saltar, cerrar, restaurar) están en lib/pestanas.ts. En celular y tableta no
 * hay pestañas: la página de siempre y la barra de abajo.
 */

const COMPUTADOR = "(min-width: 1024px)";
const claveGuardadas = (usuario: string) => `corr-pestanas:v2:${usuario}`;

const CARGAS: Record<string, () => React.ReactNode> = {
  "/panel": CargaPanel,
  "/cuadre": CargaCuadre,
  "/movimientos": CargaMovimientos,
  "/luis": CargaLuis,
  "/prestamos": CargaPrestamos,
  "/auditoria": CargaAuditoria,
  "/general": CargaGeneral,
  "/historial": CargaHistorial,
  "/bitacora": CargaBitacora,
};

function suscribirAncho(cb: () => void) {
  const mq = window.matchMedia(COMPUTADOR);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true en el computador (desde 1024 px), ya en el navegador. */
function useEscritorio(): boolean {
  return useSyncExternalStore(suscribirAncho, () => window.matchMedia(COMPUTADOR).matches, () => false);
}

function itemDe(pathname: string) {
  return NAV.find((i) => isActive(pathname, i.href));
}

function nombreDe(pathname: string) {
  const item = itemDe(pathname);
  return item && (item.corto ?? item.label);
}

const titulo = (href: string) => tituloDe(href, nombreDe);
const hrefActual = () => normalizar(location.pathname + location.search, hoyISO());

/** Lo que el servidor pintó para una pestaña y para qué pantalla. */
interface Contenido {
  href: string;
  nodo: React.ReactNode;
  /** Reemplaza a la página que ya se veía: entra sin animación. */
  quieta?: boolean;
}

/** La pestaña que muestra la página de la ruta (children) mientras llega la suya. */
interface Ruta {
  id: string;
  href: string;
}

interface PestanasApi {
  /** null fuera del computador o antes de restaurar: ahí no hay pestañas. */
  estado: EstadoPestanas | null;
  contenidos: Record<string, Contenido>;
  ruta: Ruta | null;
  /** Pestañas con algo escrito y sin guardar (el punto ámbar). */
  sucias: ReadonlySet<string>;
  marcarSucia: (id: string, sucia: boolean) => void;
  ir: (href: string, opciones?: { fondo?: boolean; aparte?: boolean }) => void;
  mostrar: (id: string) => void;
  cerrar: (id: string) => void;
  navegacionDe: (id: string) => Navegacion;
}

const PestanasCtx = createContext<PestanasApi | null>(null);

function usePestanas() {
  const api = useContext(PestanasCtx);
  if (!api) throw new Error("usePestanas va dentro de <PestanasProvider>");
  return api;
}

/** Navegar desde el riel, el buscador o los avisos: en la pestaña de adelante. */
export function useIr() {
  return usePestanas().ir;
}

/** La ruta de la pestaña de adelante, para marcar el renglón del menú. */
export function usePathnameActivo(pathname: string) {
  const { estado } = usePestanas();
  return estado ? rutaDe(pestanaActiva(estado).href) : pathname;
}

export function PestanasProvider({
  usuario,
  isAdmin,
  children,
}: {
  /** De quién son las pestañas guardadas en este equipo. */
  usuario: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const escritorio = useEscritorio();
  const [estado, setEstado] = useState<EstadoPestanas | null>(null);
  const [contenidos, setContenidos] = useState<Record<string, Contenido>>({});
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [sucias, setSucias] = useState<ReadonlySet<string>>(() => new Set());
  const [porCerrar, setPorCerrar] = useState<string | null>(null);

  // Copias al día para los manejadores (teclado, clics, respuestas del servidor).
  const estadoRef = useRef(estado);
  const contenidosRef = useRef(contenidos);
  const suciasRef = useRef(sucias);
  useLayoutEffect(() => {
    estadoRef.current = estado;
    contenidosRef.current = contenidos;
    suciasRef.current = sucias;
  });
  const pedidos = useRef(new Map<string, number>());
  const scrolls = useRef(new Map<string, number>());
  const seqPedido = useRef(0);

  const permitida = useCallback(
    (pathname: string) => {
      const item = itemDe(pathname);
      return !!item && (!item.adminOnly || isAdmin);
    },
    [isAdmin],
  );

  /** Trae del servidor la pantalla de una pestaña. Lo que llega tarde (la
   *  pestaña ya cambió de pantalla o se pidió otra vez) se descarta. */
  const cargar = useCallback((id: string, href: string, quieta = false) => {
    const n = ++seqPedido.current;
    pedidos.current.set(id, n);
    cargarPantalla(href)
      .then((nodo) => {
        if (pedidos.current.get(id) !== n) return;
        pedidos.current.delete(id);
        setContenidos((c) => {
          // Al refrescar la misma pantalla se queda como entró (sin volver a animar).
          const antes = c[id]?.href === href ? c[id].quieta : quieta;
          return { ...c, [id]: { href, nodo: nodo ?? <SinAcceso />, quieta: antes } };
        });
        setRuta((r) => (r?.id === id ? null : r));
      })
      .catch(() => {
        if (pedidos.current.get(id) !== n) return;
        pedidos.current.delete(id);
        toast.error("No se pudo cargar la pantalla. Revisa la conexión.");
      });
  }, []);

  /** Datos frescos de una pestaña (después de guardar o al volver a ella). */
  const recargar = useCallback(
    (id: string) => {
      const p = estadoRef.current?.lista.find((o) => o.id === id);
      if (p) cargar(id, p.href);
    },
    [cargar],
  );

  // Al entrar al computador: las pestañas guardadas de este usuario, más la
  // pantalla de la URL (la puerta de entrada). La de la URL muestra la página
  // que ya pintó el servidor mientras llega la suya.
  useEffect(() => {
    if (!escritorio) return;
    const href = hrefActual();
    let inicial = pestanasIniciales(href);
    try {
      const guardadas = restaurar(JSON.parse(localStorage.getItem(claveGuardadas(usuario)) ?? "null"), permitida);
      if (guardadas) {
        const r = irA(guardadas, href, { aparte: true });
        inicial = r.lleno ? irA(guardadas, href).estado : r.estado;
      }
    } catch {
      /* sin localStorage: arranca solo con la de la URL */
    }
    const id = pestanaActiva(inicial).id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el estado guardado solo existe en el navegador
    setEstado(inicial);
    setRuta({ id, href });
    setContenidos({});
    setSucias(new Set());
    cargar(id, href, true);
    const enVuelo = pedidos.current;
    const vistos = scrolls.current;
    return () => {
      setEstado(null);
      setRuta(null);
      setContenidos({});
      enVuelo.clear();
      vistos.clear();
      // De vuelta a una sola página: Next trae la de la URL que dejó la pestaña.
      router.refresh();
    };
  }, [escritorio, usuario, permitida, cargar, router]);

  // Se recuerdan por usuario, para que sigan ahí al recargar o al volver mañana.
  useEffect(() => {
    if (!estado) return;
    try {
      localStorage.setItem(claveGuardadas(usuario), JSON.stringify(paraGuardar(estado)));
    } catch {
      /* sin localStorage no se recuerdan, no es crítico */
    }
  }, [estado, usuario]);

  const frente = estado ? pestanaActiva(estado) : null;

  // La URL y el scroll siguen a la de adelante. Una pestaña que la cambió de
  // pantalla arranca arriba; una que vuelve, donde se dejó.
  useEffect(() => {
    if (!frente) return;
    if (hrefActual() !== frente.href) history.replaceState(null, "", frente.href);
    const y = scrolls.current.get(frente.id) ?? 0;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  }, [frente?.id, frente?.href]); // eslint-disable-line react-hooks/exhaustive-deps

  // La de adelante sin su pantalla (recién abierta o cambiada): se pide.
  useEffect(() => {
    if (!frente) return;
    const c = contenidos[frente.id];
    if ((!c || c.href !== frente.href) && !pedidos.current.has(frente.id)) cargar(frente.id, frente.href);
  }, [frente, contenidos, cargar]);

  /** Única entrada para cambiar las pestañas: guarda el scroll de la que se deja
   *  y trae datos frescos de la que vuelve adelante. */
  const aplicar = useCallback(
    (nuevo: EstadoPestanas) => {
      const antes = estadoRef.current;
      if (!antes) return;
      if (nuevo.activa !== antes.activa) {
        scrolls.current.set(antes.activa, window.scrollY);
        const vuelve = nuevo.lista.find((p) => p.id === nuevo.activa);
        const c = vuelve && contenidosRef.current[vuelve.id];
        if (vuelve && c && c.href === vuelve.href) cargar(vuelve.id, vuelve.href);
      }
      const frenteNuevo = pestanaActiva(nuevo);
      const frenteAntes = antes.lista.find((p) => p.id === frenteNuevo.id);
      if (frenteAntes && frenteAntes.href !== frenteNuevo.href) scrolls.current.delete(frenteNuevo.id);
      estadoRef.current = nuevo;
      setEstado(nuevo);
    },
    [cargar],
  );

  const ir = useCallback(
    (href: string, opciones: { fondo?: boolean; aparte?: boolean } = {}) => {
      const actual = estadoRef.current;
      const destino = esRutaInterna(href) ? normalizar(href, hoyISO()) : null;
      // Sin pestañas, o a algo que no es una pantalla (login, salir): Next de siempre.
      if (!actual || !destino || !permitida(rutaDe(destino))) {
        router.push(href);
        return;
      }
      // Con algo sin guardar adelante, la pantalla nueva no la pisa: va al lado.
      const r = irA(actual, destino, { ...opciones, sucia: suciasRef.current.has(actual.activa) });
      if (r.lleno) {
        toast(`Ya hay ${MAX_PESTANAS} pestañas abiertas. Cierra una para abrir otra.`);
        return;
      }
      aplicar(r.estado);
    },
    [aplicar, permitida, router],
  );

  const mostrar = useCallback(
    (id: string) => {
      const actual = estadoRef.current;
      if (actual) aplicar(activar(actual, id));
    },
    [aplicar],
  );

  const marcarSucia = useCallback((id: string, sucia: boolean) => {
    setSucias((s) => {
      if (s.has(id) === sucia) return s;
      const otra = new Set(s);
      if (sucia) otra.add(id);
      else otra.delete(id);
      return otra;
    });
  }, []);

  const cerrarYa = useCallback(
    (id: string) => {
      setPorCerrar(null);
      const actual = estadoRef.current;
      if (!actual) return;
      const nuevo = cerrarPestana(actual, id);
      if (nuevo === actual) return;
      aplicar(nuevo);
      marcarSucia(id, false);
      pedidos.current.delete(id);
      scrolls.current.delete(id);
      setContenidos((c) => {
        const resto = { ...c };
        delete resto[id];
        return resto;
      });
      setRuta((r) => (r?.id === id ? null : r));
    },
    [aplicar, marcarSucia],
  );

  /** Cerrar una pestaña con algo sin guardar pregunta antes. */
  const cerrar = useCallback(
    (id: string) => {
      if (suciasRef.current.has(id)) setPorCerrar(id);
      else cerrarYa(id);
    },
    [cerrarYa],
  );

  // Lo que una pantalla le pide al navegador (lib/use-navegacion.ts), por pestaña.
  const navegaciones = useRef(new Map<string, Navegacion>());
  const navegacionDe = useCallback(
    (id: string) => {
      let nav = navegaciones.current.get(id);
      if (!nav) {
        // Las pantallas refrescan después de guardar: ya no hay nada pendiente.
        nav = {
          refresh: () => {
            marcarSucia(id, false);
            recargar(id);
          },
          push: (href: string) => ir(href),
        };
        navegaciones.current.set(id, nav);
      }
      return nav;
    },
    [recargar, ir, marcarSucia],
  );

  // Clics en enlaces de la app (riel, avisos, flechas de día, filas): van a la
  // pestaña de adelante. Ctrl o Cmd + clic, o la rueda, la abren detrás.
  useEffect(() => {
    if (!estado) return;
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.shiftKey || e.altKey) return;
      const detras = e.type === "auxclick" ? e.button === 1 : e.button === 0 && (e.metaKey || e.ctrlKey);
      if (!detras && (e.type !== "click" || e.button !== 0)) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || !permitida(url.pathname)) return;
      e.preventDefault();
      ir(url.pathname + url.search, { fondo: detras });
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, [estado !== null, ir, permitida]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alt + 1…6 salta a esa pestaña, pero no mientras se escribe en un campo.
  useEffect(() => {
    if (!estado) return;
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit[1-6]$/.test(e.code)) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const p = estadoRef.current?.lista[Number(e.code.slice(5)) - 1];
      if (!p) return;
      e.preventDefault();
      mostrar(p.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [estado !== null, mostrar]); // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(
    () => ({ estado, contenidos, ruta, sucias, marcarSucia, ir, mostrar, cerrar, navegacionDe }),
    [estado, contenidos, ruta, sucias, marcarSucia, ir, mostrar, cerrar, navegacionDe],
  );
  const cerrando = porCerrar && estado?.lista.find((p) => p.id === porCerrar);
  return (
    <PestanasCtx.Provider value={api}>
      {children}
      <ConfirmDialog
        open={!!cerrando}
        titulo="¿Cerrar sin guardar?"
        detalle={cerrando ? `En ${titulo(cerrando.href)} hay algo escrito sin guardar. Si la cierras, se pierde.` : undefined}
        confirmar="Cerrar sin guardar"
        tono="warn"
        onConfirmar={() => porCerrar && cerrarYa(porCerrar)}
        onCancelar={() => setPorCerrar(null)}
      />
    </PestanasCtx.Provider>
  );
}

function SinAcceso() {
  return <p className="py-16 text-center text-body text-muted">Esta pantalla no está disponible para tu usuario.</p>;
}

/**
 * La tira de la barra de arriba, como en Biela: una cápsula con la pantalla
 * de cada pestaña (ícono y nombre) y el + que abre otra. La de adelante va
 * como el renglón activo del menú. La X sale en lugar del ícono al pasar el
 * mouse; la rueda del mouse también cierra. Flechas para moverse, Supr cierra,
 * Enter activa.
 */
export function TiraPestanas({ isAdmin }: { isAdmin: boolean }) {
  const { estado, sucias, ir, mostrar, cerrar } = usePestanas();
  const lista = useRef<HTMLDivElement>(null);
  if (!estado) return null;
  const todas = estado.lista;
  const varias = todas.length > 1;
  const lleno = todas.length >= MAX_PESTANAS;

  function alTeclear(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const p = todas[(i + (e.key === "ArrowRight" ? 1 : -1) + todas.length) % todas.length];
      mostrar(p.id);
      requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[data-id="${p.id}"]`)?.focus());
    } else if (e.key === "Delete" && varias) {
      e.preventDefault();
      cerrar(todas[i].id);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      mostrar(todas[i].id);
    }
  }

  // El + : las pantallas del menú, por grupo. Si ya está abierta, salta a ella.
  const grupos = GRUPOS.map((g) => NAV.filter((i) => i.grupo === g.id && (!i.adminOnly || isAdmin))).filter(
    (g) => g.length > 0,
  );
  const abiertaDe = (href: string) => todas.find((p) => p.href === href);

  return (
    <div className="hidden h-[46px] min-w-0 items-center gap-0.5 rounded-full bg-[var(--menu-hover)] px-1 shadow-[0_0_0_1px_var(--line)] lg:flex">
      <div ref={lista} role="tablist" aria-label="Pestañas abiertas" className="flex min-w-0 items-center gap-0.5">
        {todas.map((p, i) => {
          const on = p.id === estado.activa;
          const nombre = titulo(p.href);
          const Icono = itemDe(rutaDe(p.href))?.icon;
          const sucia = sucias.has(p.id);
          return (
            <div
              key={p.id}
              data-id={p.id}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              title={sucia ? `${nombre}, sin guardar` : nombre}
              onClick={() => mostrar(p.id)}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              onAuxClick={(e) => {
                if (e.button === 1 && varias) {
                  e.preventDefault();
                  cerrar(p.id);
                }
              }}
              onKeyDown={(e) => alTeclear(e, i)}
              className={cn(
                "group relative flex h-[38px] min-w-16 max-w-[220px] cursor-pointer items-center gap-[7px] rounded-full px-3 text-body whitespace-nowrap select-none transition-[background-color,color,scale] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                on
                  ? "shrink-0 bg-menu-activo font-semibold text-text shadow-[var(--pastilla-sombra)]"
                  : "shrink font-medium text-muted hover:bg-[var(--menu-hover)] hover:text-text",
              )}
            >
              {Icono && (
                <Icono
                  size={16}
                  weight={on ? "fill" : "regular"}
                  aria-hidden
                  className={cn("shrink-0 transition-opacity", varias && "group-hover:opacity-0 group-focus-visible:opacity-0")}
                />
              )}
              <span className="min-w-0 truncate">{nombre}</span>
              {sucia && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn-fg" />}
              {varias && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Cerrar ${nombre}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    cerrar(p.id);
                  }}
                  className="pointer-events-none absolute top-1/2 left-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:opacity-100 hover:bg-fill"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={lleno}>
          <IconButton
            forma="suelto"
            label={lleno ? `Ya hay ${MAX_PESTANAS}: cierra una para abrir otra` : "Abrir otra pestaña"}
            className={cn("size-[38px] shrink-0 rounded-full text-text hover:bg-[var(--menu-hover)] disabled:opacity-35", !varias && "ml-0.5")}
          >
            <Plus size={18} weight="bold" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-60">
          {grupos.map((items, gi) => (
            <div key={items[0].grupo}>
              {gi > 0 && <DropdownMenuSeparator />}
              {items.map((item) => {
                const Icono = item.icon;
                const ya = abiertaDe(item.href);
                return (
                  <DropdownMenuItem key={item.href} onSelect={() => (ya ? mostrar(ya.id) : ir(item.href, { aparte: true }))}>
                    <Icono size={18} />
                    <span className="flex-1">{item.label}</span>
                    {ya && <span className="text-meta font-medium text-faint">Abierta</span>}
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * El lugar del contenido. Fuera del computador, la página de la ruta. En el
 * computador, todas las pestañas montadas y solo la de adelante a la vista:
 * las de atrás conservan lo escrito, los filtros y el scroll. La pestaña de la
 * URL muestra la página que ya pintó el servidor hasta que llega la suya.
 */
export function ContenidoPestanas({ children }: { children: React.ReactNode }) {
  const { estado, contenidos, ruta, marcarSucia, navegacionDe } = usePestanas();
  if (!estado) return <>{children}</>;
  return (
    <>
      {estado.lista.map((p) => {
        const c = contenidos[p.id];
        const Carga = CARGAS[rutaDe(p.href)];
        const cuerpo =
          c && c.href === p.href ? (
            // La key cambia con la pantalla: otra pantalla en la misma pestaña
            // entra de cero, como al navegar; refrescar la misma no la desmonta.
            <div key={p.href} className={c.quieta ? undefined : "entra-bloques"}>
              {c.nodo}
            </div>
          ) : ruta?.id === p.id && ruta.href === p.href ? (
            children
          ) : Carga ? (
            <Carga />
          ) : null;
        return (
          <PaginaPestana key={p.id} id={p.id} activa={p.id === estado.activa} titulo={titulo(p.href)} alEscribir={marcarSucia}>
            <NavegacionCtx.Provider value={navegacionDe(p.id)}>{cuerpo}</NavegacionCtx.Provider>
          </PaginaPestana>
        );
      })}
    </>
  );
}

/**
 * La página de una pestaña. Escribir en un campo la marca como sin guardar (el
 * punto ámbar); buscar y filtrar no cuentan. Se limpia cuando la pantalla
 * guarda (useNavegacion().refresh). El aviso sale después de la tecla y no
 * durante: este oyente va antes que el de React y marcar ahí repintaba con el
 * campo aún vacío (en Biela se perdía la primera letra).
 */
function PaginaPestana({
  id,
  activa,
  titulo,
  alEscribir,
  children,
}: {
  id: string;
  activa: boolean;
  titulo: string;
  alEscribir: (id: string, sucia: boolean) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let marca = 0;
    function onCambio(e: Event) {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)) return;
      if (t.type === "search" || /^Buscar/i.test(t.getAttribute("placeholder") ?? "") || t.closest("[data-sin-guardar=no]")) return;
      window.clearTimeout(marca);
      marca = window.setTimeout(() => alEscribir(id, true), 0);
    }
    el.addEventListener("input", onCambio);
    el.addEventListener("change", onCambio);
    return () => {
      el.removeEventListener("input", onCambio);
      el.removeEventListener("change", onCambio);
      window.clearTimeout(marca);
    };
  }, [id, alEscribir]);
  return (
    <section ref={ref} hidden={!activa} aria-label={titulo} data-pestana={id}>
      {children}
    </section>
  );
}
