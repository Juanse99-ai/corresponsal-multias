"use client";

import { Suspense, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { IconButton } from "@/components/ui/icon-button";
import { NAV, isActive } from "@/components/shell/nav-items";
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

function nombreDe(pathname: string) {
  const item = NAV.find((i) => isActive(pathname, i.href));
  return item && (item.corto ?? item.label);
}

const titulo = (href: string) => tituloDe(href, nombreDe);

function enviar(destino: Window, msg: MensajeVentana) {
  destino.postMessage(msg, location.origin);
}

/** Abre `href` en una pestaña nueva, se pida desde la ventana principal o desde una pestaña. */
export function pedirPestana(href: string, activar: boolean) {
  if (document.documentElement.classList.contains("en-ventana")) {
    enviar(window.parent, { corr: "ventana", tipo: "abrir", href, activar });
  } else {
    window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { href, activar } }));
  }
}

/** La pantalla que se ve ahora, con su ?fecha=. */
export function hrefActual() {
  return location.pathname + location.search;
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

/** Dentro de una pestaña: le cuenta a la principal qué pantalla se ve y trae datos frescos al volver. */
export function PuenteVentana() {
  const router = useRouter();
  useEffect(() => {
    function onMensaje(e: MessageEvent) {
      if (e.source !== window.parent || e.origin !== location.origin || !esMensajeVentana(e.data)) return;
      if (e.data.tipo === "refrescar") router.refresh();
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

/** Barra de pestañas del computador sobre el marco, y las pestañas de más. */
export function Pestanas() {
  const montado = useMontado();
  return montado ? (
    <Suspense fallback={null}>
      <BarraPestanas />
    </Suspense>
  ) : null;
}

function BarraPestanas() {
  const router = useRouter();
  const hrefPrincipal = useHref();
  const [otras, setOtras] = useState<Pestana[]>(guardadasIniciales);
  const [activa, setActiva] = useState(PRINCIPAL);
  const marcos = useRef(new Map<string, HTMLIFrameElement>());

  // Se guardan para que sigan ahí al recargar o al volver mañana.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify(otras.map(({ id, href }) => ({ id, href }))));
    } catch {
      /* sin localStorage no se guardan, no es crítico */
    }
  }, [otras]);

  // El CSS esconde el marco de la principal mientras se ve otra pestaña.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("con-pestanas", otras.length > 0);
    if (activa === PRINCIPAL) delete html.dataset.pestana;
    else html.dataset.pestana = "otra";
  }, [otras.length, activa]);
  useEffect(
    () => () => {
      document.documentElement.classList.remove("con-pestanas");
      delete document.documentElement.dataset.pestana;
    },
    [],
  );

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

  const alAbrir = useEffectEvent(abrir);
  const alCambiarHref = useEffectEvent((fuente: MessageEventSource | null, href: string) => {
    const id = [...marcos.current].find(([, f]) => f.contentWindow === fuente)?.[0];
    if (id) setOtras(otras.map((o) => (o.id === id ? { ...o, href } : o)));
  });

  useEffect(() => {
    function onMensaje(e: MessageEvent) {
      if (e.origin !== location.origin || !esMensajeVentana(e.data)) return;
      if (e.data.tipo === "abrir") alAbrir(e.data.href, e.data.activar);
      else if (e.data.tipo === "href" && esRutaInterna(e.data.href)) alCambiarHref(e.source, e.data.href);
    }
    function onAbrir(e: Event) {
      const { href, activar } = (e as CustomEvent<{ href: string; activar: boolean }>).detail;
      alAbrir(href, activar);
    }
    window.addEventListener("message", onMensaje);
    window.addEventListener(EVENTO_ABRIR, onAbrir);
    return () => {
      window.removeEventListener("message", onMensaje);
      window.removeEventListener(EVENTO_ABRIR, onAbrir);
    };
  }, []);

  const todas = [{ id: PRINCIPAL, href: hrefPrincipal }, ...otras];
  const hrefActiva = todas.find((p) => p.id === activa)?.href ?? hrefPrincipal;

  return (
    <>
      {otras.length > 0 && (
        <div role="tablist" aria-label="Pestañas" className="pestanas sticky top-0 z-30 hidden items-center gap-1 px-[14px] lg:flex">
          {todas.map((p) => {
            const on = p.id === activa;
            const nombre = titulo(p.href);
            return (
              <div
                key={p.id}
                className={cn(
                  "flex h-8 min-w-0 max-w-[200px] items-center rounded-full text-body transition-colors",
                  on
                    ? "bg-blanco font-semibold text-text shadow-[var(--pastilla-sombra)]"
                    : "font-medium text-muted hover:bg-[var(--menu-hover)] hover:text-text",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => mostrar(p.id)}
                  className={cn(
                    "h-full min-w-0 flex-1 truncate rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    p.id === PRINCIPAL ? "px-3.5" : "pl-3.5 pr-1",
                  )}
                >
                  {nombre}
                </button>
                {p.id !== PRINCIPAL && (
                  <button
                    type="button"
                    aria-label={`Cerrar ${nombre}`}
                    title={`Cerrar ${nombre}`}
                    onClick={() => cerrar(p.id)}
                    className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-faint hover:bg-[var(--menu-hover)] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>
            );
          })}
          <IconButton
            forma="suelto"
            label="Pestaña nueva"
            className="size-8 rounded-full text-muted hover:bg-[var(--menu-hover)] hover:text-text"
            onClick={() => abrir(hrefActiva, true)}
          >
            <Plus size={16} weight="bold" />
          </IconButton>
        </div>
      )}

      <div className="hidden lg:block">
        {otras
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
              // Escondida y no quitada: así conserva lo que tenía.
              style={{ display: p.id === activa ? "block" : "none" }}
            />
          ))}
      </div>
    </>
  );
}
