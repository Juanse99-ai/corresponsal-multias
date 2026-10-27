"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GRUPOS, NAV, isActive } from "@/components/shell/nav-items";
import { useMontado } from "@/lib/use-montado";
import { cn } from "@/lib/utils";
import {
  CLAVE_GUARDADAS,
  EVENTO_ABRIR,
  MAX_PESTANAS,
  esMensajeVentana,
  esRutaInterna,
  leerGuardadas,
  tituloDe,
  type MensajeVentana,
} from "@/lib/ventanas";

const PRINCIPAL = "principal";
const COMPUTADOR = "(min-width: 1024px)";

const sinSuscripcion = () => () => {};

/** true dentro de una pestaña (el script de lib/ventanas.ts marca <html> antes de pintar). */
export function useEnVentana(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => document.documentElement.classList.contains("en-ventana"),
    () => false,
  );
}

const enVentana = () => document.documentElement.classList.contains("en-ventana");

function itemDe(pathname: string) {
  return NAV.find((i) => isActive(pathname, i.href));
}

function nombreDe(pathname: string) {
  const item = itemDe(pathname);
  return item && (item.corto ?? item.label);
}

const titulo = (href: string) => tituloDe(href, nombreDe);
const rutaDe = (href: string) => new URL(href, "http://x").pathname;

function enviar(destino: Window, msg: MensajeVentana) {
  destino.postMessage(msg, location.origin);
}

/** Abre `href` en una pestaña nueva, se pida desde la ventana principal o desde una pestaña. */
export function pedirPestana(href: string, activar: boolean) {
  if (enVentana()) {
    enviar(window.parent, { corr: "ventana", tipo: "abrir", href, activar });
  } else {
    window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { href, activar } }));
  }
}

function useHref() {
  const pathname = usePathname();
  const q = useSearchParams().toString();
  return q ? `${pathname}?${q}` : pathname;
}

/**
 * Ctrl o Cmd + clic (o la rueda) sobre un enlace de la app lo abre en una
 * pestaña de la app, detrás de la que se está viendo, como en el navegador.
 * Solo en el computador: es donde viven las pestañas.
 */
export function AbrirConTecla() {
  useEffect(() => {
    const computador = window.matchMedia(COMPUTADOR);
    function onClick(e: MouseEvent) {
      const conTecla = e.type === "auxclick" ? e.button === 1 : e.button === 0 && (e.metaKey || e.ctrlKey);
      if (!conTecla || !computador.matches) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      pedirPestana(url.pathname + url.search, false);
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}

/**
 * Dentro de una pestaña: le cuenta a la principal qué pantalla se ve, trae
 * datos frescos al volver y va a la pantalla que se pida desde el menú de afuera.
 */
export function PuenteVentana() {
  const router = useRouter();
  useEffect(() => {
    function onMensaje(e: MessageEvent) {
      if (e.source !== window.parent || e.origin !== location.origin || !esMensajeVentana(e.data)) return;
      if (e.data.tipo === "refrescar") router.refresh();
      else if (e.data.tipo === "ir" && esRutaInterna(e.data.href)) router.push(e.data.href);
    }
    window.addEventListener("message", onMensaje);
    return () => window.removeEventListener("message", onMensaje);
  }, [router]);
  return (
    <Suspense fallback={null}>
      <AvisarHref />
    </Suspense>
  );
}

function AvisarHref() {
  const href = useHref();
  useEffect(() => {
    enviar(window.parent, { corr: "ventana", tipo: "href", href });
  }, [href]);
  return null;
}

interface Pestana {
  id: string;
  /** La pantalla que se ve ahora (cambia al navegar dentro). */
  href: string;
  /** Con la que se abrió: cambiarla recargaría el iframe y se perdería lo escrito. */
  src: string;
  /** Las que vuelven de localStorage cargan cuando se abren por primera vez. */
  cargada: boolean;
}

function nuevoId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function guardadasIniciales(): Pestana[] {
  if (typeof window === "undefined") return [];
  try {
    return leerGuardadas(localStorage.getItem(CLAVE_GUARDADAS)).map((g) => ({ ...g, src: g.href, cargada: false }));
  } catch {
    return [];
  }
}

interface PestanasApi {
  otras: Pestana[];
  activa: string;
  marcos: React.RefObject<Map<string, HTMLIFrameElement>>;
  abrir: (href: string, activar: boolean) => void;
  mostrar: (id: string) => void;
  cerrar: (id: string) => void;
  /** Lleva la pestaña de adelante a `href` (el menú, el buscador). */
  ir: (href: string) => void;
}

const PestanasCtx = createContext<PestanasApi | null>(null);

function usePestanas() {
  const api = useContext(PestanasCtx);
  if (!api) throw new Error("usePestanas va dentro de <PestanasProvider>");
  return api;
}

/** Navegar desde el riel o el buscador: a la pestaña que se está viendo. */
export function useIr() {
  return usePestanas().ir;
}

/** La ruta de la pestaña de adelante, para marcar el renglón del menú. */
export function usePathnameActivo(pathnamePrincipal: string) {
  const { otras, activa } = usePestanas();
  const otra = otras.find((o) => o.id === activa);
  return otra ? rutaDe(otra.href) : pathnamePrincipal;
}

/**
 * Las pestañas del computador. Guarda cuáles hay y cuál se ve; la tira
 * (TiraPestanas) y el contenido (ContenidoPestanas) la leen. Dentro de una
 * pestaña no hace nada: ahí solo existe la principal.
 */
export function PestanasProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [otras, setOtras] = useState<Pestana[]>(guardadasIniciales);
  const [activa, setActiva] = useState(PRINCIPAL);
  const marcos = useRef(new Map<string, HTMLIFrameElement>());

  // Se guardan para que sigan ahí al recargar o al volver mañana.
  useEffect(() => {
    if (enVentana()) return;
    try {
      localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify(otras.map(({ id, href }) => ({ id, href }))));
    } catch {
      /* sin localStorage no se guardan, no es crítico */
    }
  }, [otras]);

  function abrir(href: string, activar: boolean) {
    if (!esRutaInterna(href)) return;
    if (otras.length >= MAX_PESTANAS - 1) {
      toast(`Ya hay ${MAX_PESTANAS} pestañas abiertas. Cierra una para abrir otra.`);
      return;
    }
    const id = nuevoId();
    setOtras([...otras, { id, href, src: href, cargada: true }]);
    if (activar) setActiva(id);
  }

  function mostrar(id: string) {
    if (id === activa) return;
    setActiva(id);
    // Lo que se guardó en otra pestaña llega al volver; lo escrito no se pierde.
    if (id === PRINCIPAL) {
      router.refresh();
      return;
    }
    const p = otras.find((o) => o.id === id);
    if (!p) return;
    if (!p.cargada) setOtras(otras.map((o) => (o.id === id ? { ...o, cargada: true } : o)));
    else {
      const ventana = marcos.current.get(id)?.contentWindow;
      if (ventana) enviar(ventana, { corr: "ventana", tipo: "refrescar" });
    }
  }

  function cerrar(id: string) {
    const i = otras.findIndex((o) => o.id === id);
    if (i < 0) return;
    // Como en el navegador: queda la de la derecha, o la de la izquierda.
    if (id === activa) mostrar(otras[i + 1]?.id ?? otras[i - 1]?.id ?? PRINCIPAL);
    setOtras((os) => os.filter((o) => o.id !== id));
  }

  function ir(href: string) {
    const ventana = activa === PRINCIPAL ? null : marcos.current.get(activa)?.contentWindow;
    if (!ventana) {
      router.push(href);
      return;
    }
    enviar(ventana, { corr: "ventana", tipo: "ir", href });
    setOtras(otras.map((o) => (o.id === activa ? { ...o, href } : o)));
  }

  const alAbrir = useEffectEvent(abrir);
  const alIr = useEffectEvent(ir);
  const alCambiarHref = useEffectEvent((fuente: MessageEventSource | null, href: string) => {
    const id = [...marcos.current].find(([, f]) => f.contentWindow === fuente)?.[0];
    if (id) setOtras(otras.map((o) => (o.id === id ? { ...o, href } : o)));
  });
  const alSalirDelComputador = useEffectEvent(() => mostrar(PRINCIPAL));
  const hayOtraAdelante = activa !== PRINCIPAL;

  useEffect(() => {
    if (enVentana()) return;
    function onMensaje(e: MessageEvent) {
      if (e.origin !== location.origin || !esMensajeVentana(e.data)) return;
      if (e.data.tipo === "abrir") alAbrir(e.data.href, e.data.activar);
      else if (e.data.tipo === "href" && esRutaInterna(e.data.href)) alCambiarHref(e.source, e.data.href);
    }
    function onAbrir(e: Event) {
      const { href, activar } = (e as CustomEvent<{ href: string; activar: boolean }>).detail;
      alAbrir(href, activar);
    }
    // En celular y tableta no hay tira: vuelve a la principal.
    const computador = window.matchMedia(COMPUTADOR);
    function onCambioAncho() {
      if (!computador.matches) alSalirDelComputador();
    }
    window.addEventListener("message", onMensaje);
    window.addEventListener(EVENTO_ABRIR, onAbrir);
    computador.addEventListener("change", onCambioAncho);
    return () => {
      window.removeEventListener("message", onMensaje);
      window.removeEventListener(EVENTO_ABRIR, onAbrir);
      computador.removeEventListener("change", onCambioAncho);
    };
  }, []);

  // Con otra pestaña adelante, los enlaces del riel y de la barra (avisos)
  // la llevan a ella y no a la principal, que está escondida.
  useEffect(() => {
    if (!hayOtraAdelante) return;
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      alIr(url.pathname + url.search);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hayOtraAdelante]);

  return (
    <PestanasCtx.Provider value={{ otras, activa, marcos, abrir, mostrar, cerrar, ir }}>
      {children}
    </PestanasCtx.Provider>
  );
}

/**
 * La tira de la barra de arriba, como en Biela: una cápsula con la pantalla
 * de cada pestaña (ícono y nombre) y el + que abre otra. La de adelante va
 * como el renglón activo del menú. La X sale en lugar del ícono al pasar el
 * mouse; la rueda del mouse también cierra. Flechas para moverse, Supr cierra.
 */
export function TiraPestanas({ isAdmin }: { isAdmin: boolean }) {
  const montado = useMontado();
  return montado ? (
    <Suspense fallback={null}>
      <Tira isAdmin={isAdmin} />
    </Suspense>
  ) : null;
}

function Tira({ isAdmin }: { isAdmin: boolean }) {
  const { otras, activa, abrir, mostrar, cerrar } = usePestanas();
  const hrefPrincipal = useHref();
  const lista = useRef<HTMLDivElement>(null);
  const todas = [{ id: PRINCIPAL, href: hrefPrincipal }, ...otras];
  const varias = todas.length > 1;
  const lleno = todas.length >= MAX_PESTANAS;

  function alTeclear(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const p = todas[(i + (e.key === "ArrowRight" ? 1 : -1) + todas.length) % todas.length];
      mostrar(p.id);
      requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[data-id="${p.id}"]`)?.focus());
    } else if (e.key === "Delete" && todas[i].id !== PRINCIPAL) {
      e.preventDefault();
      cerrar(todas[i].id);
    }
  }

  // El + : las pantallas del menú, por grupo. Si ya está abierta, salta a ella.
  const grupos = GRUPOS.map((g) => NAV.filter((i) => i.grupo === g.id && (!i.adminOnly || isAdmin))).filter(
    (g) => g.length > 0,
  );
  const abiertaDe = (href: string) => todas.find((p) => isActive(rutaDe(p.href), href));

  return (
    <div className="hidden h-[46px] min-w-0 items-center gap-0.5 rounded-full bg-[var(--menu-hover)] px-1 shadow-[0_0_0_1px_var(--line)] lg:flex">
      <div ref={lista} role="tablist" aria-label="Pestañas abiertas" className="flex min-w-0 items-center gap-0.5">
        {todas.map((p, i) => {
          const on = p.id === activa;
          const nombre = titulo(p.href);
          const Icono = itemDe(rutaDe(p.href))?.icon;
          const cerrable = p.id !== PRINCIPAL;
          return (
            <div
              key={p.id}
              data-id={p.id}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              title={nombre}
              onClick={() => mostrar(p.id)}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              onAuxClick={(e) => {
                if (e.button === 1 && cerrable) {
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
                  className={cn("shrink-0 transition-opacity", cerrable && "group-hover:opacity-0 group-focus-visible:opacity-0")}
                />
              )}
              <span className="min-w-0 truncate">{nombre}</span>
              {cerrable && (
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
                  <DropdownMenuItem key={item.href} onSelect={() => (ya ? mostrar(ya.id) : abrir(item.href, true))}>
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
 * El lugar del contenido: la página de la principal o, si hay otra pestaña
 * adelante, su iframe. Las de atrás quedan escondidas y no quitadas, así
 * conservan lo que tenían.
 */
export function ContenidoPestanas({ children }: { children: React.ReactNode }) {
  const { otras, activa, marcos } = usePestanas();
  const montado = useMontado();
  return (
    <>
      <div style={activa === PRINCIPAL ? undefined : { display: "none" }}>{children}</div>
      {montado &&
        otras
          .filter((p) => p.cargada)
          .map((p) => (
            <iframe
              key={p.id}
              ref={(el) => {
                if (el) marcos.current.set(p.id, el);
                else marcos.current.delete(p.id);
              }}
              src={p.src}
              title={titulo(p.href)}
              className="pestana-marco w-full border-0"
              style={{ display: p.id === activa ? "block" : "none" }}
            />
          ))}
    </>
  );
}
