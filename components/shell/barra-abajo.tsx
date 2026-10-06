"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivarAvisos } from "@/components/push/activar-avisos";
import { signOutAction } from "@/app/login/actions";
import { NAV, isActive, type NavItem } from "@/components/shell/nav-items";
import { buildAvisos } from "@/components/shell/top-header";
import { iniciales } from "@/components/shell/riel-panel";
import { decidirChica, esArrastre, indiceEnBarra } from "@/lib/barra";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";

const ROL: Record<Rol, string> = { admin: "Administrador", operador: "Operador" };

/** Las pantallas sueltas en la barra (la opción A que eligió el dueño); el
 *  resto vive en la hoja de Tú. */
const EN_BARRA = ["/panel", "/cuadre", "/movimientos", "/luis"];

const esCampo = (el: EventTarget | Element | null) =>
  el instanceof Element &&
  el.matches(
    'input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=file],[type=range]),textarea,select,[contenteditable="true"]',
  );

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Lente = { l: number; w: number; bw: number; i: number; fase: "entra" | "mueve" | "sale"; sx: number; sy: number };
type Gesto = { x0: number; i: number; arrastrando: boolean; ux: number; ut: number; moviendo: boolean; iPintado: number };

/**
 * Barra de abajo del celular (estilo WhatsApp en iOS 26, guía 8.20): cápsula
 * de vidrio con Panel, Cuadre, Movimientos y Sr. Luis, y "Tú" al final, que
 * sube una hoja con lo demás (Préstamos, Administración), quién entró, el
 * tema, los avisos y cerrar sesión. El globo rojo cuenta lo pendiente.
 * - Se encoge al bajar por la pantalla y vuelve al subir.
 * - Al apoyar el dedo sale una lupa de vidrio que se puede correr por la
 *   barra (vibra al cambiar de botón); al soltar se abre ese botón.
 * - Mientras se escribe, baja para no tapar el campo sobre el teclado.
 * Las rutas y lo que ve cada rol son las del riel del computador (NAV).
 */
export function BarraAbajo({
  profile,
  isAdmin,
  pathname,
  resumen,
}: {
  profile: { nombre: string; rol: Rol };
  isAdmin: boolean;
  pathname: string;
  resumen: HeaderResumen;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [chica, setChica] = useState(false);
  const [lente, setLente] = useState<Lente | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const lenteRef = useRef<HTMLSpanElement>(null);
  const lupaRef = useRef<HTMLSpanElement>(null);
  const gesto = useRef<Gesto | null>(null);
  // El clic que llega justo después de soltar un arrastre no cuenta.
  const sinClickHasta = useRef(0);
  const relojLente = useRef(0);

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);
  const enBarra = EN_BARRA.map((href) => items.find((i) => i.href === href)).filter((i): i is NavItem => !!i);
  const enHoja = items.filter((i) => !enBarra.includes(i));
  const principales = enHoja.filter((i) => i.grupo === "main");
  const admin = enHoja.filter((i) => i.grupo === "admin");

  // Pendientes: el cuadre con un aviso urgente del día y los préstamos.
  const cuadreUrgente = useMemo(
    () => buildAvisos(resumen).some((a) => a.href === "/cuadre" && (a.tone === "danger" || a.tone === "warn")),
    [resumen],
  );
  const pendientes = (href: string) =>
    href === "/prestamos" ? resumen.prestamosCount : href === "/cuadre" && cuadreUrgente ? 1 : 0;

  const n = enBarra.length + 1;
  const iTu = enBarra.length;
  const enHojaAbierta = enHoja.some((i) => isActive(pathname, i.href));
  const iActiva = abierta || enHojaAbierta ? iTu : enBarra.findIndex((i) => isActive(pathname, i.href));
  const tocando = !!lente && lente.fase !== "sale";
  const elegida = tocando ? lente.i : iActiva;

  // Al bajar por la pantalla se encoge; al subir o arriba del todo, normal.
  // Se mira el scroll una vez por cuadro. Con reducir movimiento no cambia.
  useEffect(() => {
    let y0 = window.scrollY;
    let acum = 0;
    let cuadro = 0;
    const mirar = () => {
      cuadro = 0;
      const y = window.scrollY;
      const d = decidirChica({ y, dy: y - y0, acum });
      y0 = y;
      acum = d.acum;
      if (d.chica !== null) setChica(d.chica && !quieto());
    };
    const alScroll = () => {
      if (!cuadro) cuadro = requestAnimationFrame(mirar);
    };
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", alScroll);
      cancelAnimationFrame(cuadro);
    };
  }, []);

  // Mientras se escribe, baja: sobre el teclado taparía el campo. Escribir es
  // un campo con foco Y el teclado arriba (el viewport visible se encoge, en
  // iOS y en Chrome de Android): un campo con autoFocus no saca el teclado en
  // el iPhone y no debe esconder la barra. Al pasar de un campo a otro llega
  // focusout y luego focusin: se mira en el siguiente tic para no parpadear.
  useEffect(() => {
    const vv = window.visualViewport;
    const teclado = () => !vv || window.innerHeight - vv.height > 150;
    let reloj = 0;
    const mirar = () => {
      clearTimeout(reloj);
      reloj = window.setTimeout(() => setEscribiendo(esCampo(document.activeElement) && teclado()), 0);
    };
    document.addEventListener("focusin", mirar);
    document.addEventListener("focusout", mirar);
    vv?.addEventListener("resize", mirar);
    return () => {
      clearTimeout(reloj);
      document.removeEventListener("focusin", mirar);
      document.removeEventListener("focusout", mirar);
      vv?.removeEventListener("resize", mirar);
    };
  }, []);

  useEffect(() => () => clearTimeout(relojLente.current), []);

  // abrirSiempre: al soltar un arrastre sobre Tú se abre aunque ya estuviera.
  const tocar = (i: number, abrirSiempre = false) => {
    if (i === iTu) {
      setAbierta((a) => abrirSiempre || !a);
      return;
    }
    setAbierta(false);
    router.push(enBarra[i].href);
  };

  // ===== La lupa =====
  // Las cuentas van en las medidas de la barra SIN escala (offsetWidth): la
  // barra se encoge al bajar y crece al tocarla, y la lupa vive dentro. El
  // dedo se pasa a esas medidas con la escala de ese instante.
  const medir = () => {
    const nav = navRef.current!;
    const r = nav.getBoundingClientRect();
    const W = nav.offsetWidth || r.width;
    return { r, W, k: r.width ? W / r.width : 1, ancho: W - 14 };
  };
  type Medida = ReturnType<typeof medir>;
  const aLocal = (x: number, c: Medida) => (x - c.r.left) * c.k;
  const lenteSobre = (centro: number, c: Medida) => {
    const w = Math.min((c.ancho / n) * 1.3, 124);
    return { l: Math.min(c.W - w * 0.86, Math.max(-w * 0.14, centro - w / 2)), w, bw: c.W };
  };
  const centroDe = (i: number, c: Medida) => 7 + (c.ancho / n) * (i + 0.5);

  const soltarLente = (i: number) => {
    const c = medir();
    setLente((l) => (l ? { ...l, ...lenteSobre(centroDe(i, c), c), i, fase: "sale", sx: 1, sy: 1 } : l));
    clearTimeout(relojLente.current);
    relojLente.current = window.setTimeout(() => setLente(null), 320);
  };

  const alApoyar = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (quieto()) return;
    clearTimeout(relojLente.current);
    const c = medir();
    const i = indiceEnBarra(aLocal(e.clientX, c), 7, c.ancho, n);
    gesto.current = { x0: e.clientX, i, arrastrando: false, ux: e.clientX, ut: e.timeStamp, moviendo: false, iPintado: i };
    setLente({ ...lenteSobre(centroDe(i, c), c), i, fase: "entra", sx: 1, sy: 1 });
  };

  const alMover = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    if (!g.arrastrando) {
      if (!esArrastre(e.clientX - g.x0)) return;
      g.arrastrando = true;
    }
    const c = medir();
    const x = aLocal(e.clientX, c);
    const i = indiceEnBarra(x, 7, c.ancho, n);
    if (i !== g.i) {
      g.i = i;
      navigator.vibrate?.(8);
    }
    // Se estira a lo ancho con la velocidad del dedo (px/ms) y se aplana.
    const v = Math.abs(e.clientX - g.ux) / Math.max(1, e.timeStamp - g.ut);
    g.ux = e.clientX;
    g.ut = e.timeStamp;
    const sx = 1 + Math.min(v * 0.16, 0.24);
    const nuevo: Lente = { ...lenteSobre(x, c), i, fase: "mueve", sx, sy: 1 - (sx - 1) * 0.55 };
    // Mientras el dedo sigue sobre el mismo botón, la lupa se mueve escribiendo
    // su estilo directo: pasar por React en cada movimiento redibuja la barra
    // y su copia unas 60 veces por segundo, y en un celular modesto se traba.
    const el = lenteRef.current;
    const lupa = lupaRef.current;
    if (el && lupa && g.moviendo && i === g.iPintado) {
      el.style.translate = `${nuevo.l}px 0`;
      el.style.setProperty("--sx", String(nuevo.sx));
      el.style.setProperty("--sy", String(nuevo.sy));
      lupa.style.translate = `${-nuevo.l}px 0`;
      lupa.style.transformOrigin = `${nuevo.l + nuevo.w / 2}px 50%`;
      return;
    }
    g.moviendo = true;
    g.iPintado = i;
    setLente(nuevo);
  };

  const alSoltar = (e: React.PointerEvent) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    if (g.arrastrando) {
      sinClickHasta.current = e.timeStamp + 450;
      tocar(g.i, true);
    }
    soltarLente(g.i);
  };

  const alCancelar = () => {
    const g = gesto.current;
    gesto.current = null;
    if (g) soltarLente(g.i);
    else setLente(null);
  };

  const contenido = (i: number) => {
    if (i === iTu) {
      return (
        <>
          <span className="gbar__ic">
            <span className="gbar__av">{iniciales(profile.nombre)}</span>
            <Globo n={enHoja.reduce((t, it) => t + pendientes(it.href), 0)} />
          </span>
          <span className="gbar__t">Tú</span>
        </>
      );
    }
    const item = enBarra[i];
    const Icono = item.icon;
    return (
      <>
        <span className="gbar__ic">
          <Icono weight={elegida === i ? "bold" : "regular"} />
          <Globo n={pendientes(item.href)} />
        </span>
        <span className="gbar__t">{item.corto ?? item.label}</span>
      </>
    );
  };

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Menú"
        className={cn(
          "gbar",
          abierta && "gbar--arriba",
          escribiendo && "gbar--abajo",
          tocando ? "gbar--toca" : chica && !abierta && "gbar--chica",
        )}
        style={{ "--n": n } as React.CSSProperties}
        onPointerDown={alApoyar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alCancelar}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {iActiva >= 0 && (
          <span
            aria-hidden
            className={cn("gbar__pil", tocando && "gbar__pil--bajo")}
            style={{ left: `calc(7px + ${iActiva + 0.5} * (100% - 14px) / ${n})` }}
          />
        )}
        {enBarra.map((item, i) => {
          const activo = isActive(pathname, item.href);
          return (
            <Button key={item.href} asChild variant="ghost" className="gbar__b" data-sobre={elegida === i || undefined}>
              <Link
                href={item.href}
                // Sin el arrastre nativo del enlace: cancelaría la lupa al correr el dedo.
                draggable={false}
                aria-label={item.label}
                aria-current={activo ? "page" : undefined}
                onClick={(e) => {
                  if (e.timeStamp < sinClickHasta.current) {
                    e.preventDefault();
                    return;
                  }
                  setAbierta(false);
                }}
              >
                {contenido(i)}
              </Link>
            </Button>
          );
        })}
        <Button
          variant="ghost"
          className="gbar__b"
          data-sobre={elegida === iTu || undefined}
          aria-label="Tú: más pantallas y cuenta"
          aria-expanded={abierta}
          aria-current={!abierta && enHojaAbierta ? "page" : undefined}
          onClick={(e) => {
            if (e.timeStamp < sinClickHasta.current) return;
            setAbierta((v) => !v);
          }}
        >
          {contenido(iTu)}
        </Button>

        {/* La lupa: dentro lleva una copia de la fila, agrandada y alineada con
            la de verdad, así se ve lo de debajo más grande. */}
        {lente && (
          <span
            ref={lenteRef}
            aria-hidden
            className={`gbar__lente gbar__lente--${lente.fase}`}
            style={
              { translate: `${lente.l}px 0`, width: lente.w, "--sx": lente.sx, "--sy": lente.sy } as React.CSSProperties
            }
          >
            <span
              ref={lupaRef}
              className="gbar__lupa"
              style={{ translate: `${-lente.l}px 0`, width: lente.bw, transformOrigin: `${lente.l + lente.w / 2}px 50%` }}
            >
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="gbar__b" data-sobre={i === lente.i || undefined}>
                  {contenido(i)}
                </span>
              ))}
            </span>
          </span>
        )}
      </nav>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent
          side="barra"
          aria-describedby={undefined}
          // Tocar la barra con la hoja arriba no la cierra: lo decide el botón.
          onPointerDownOutside={(e) => {
            if ((e.target as Element | null)?.closest?.(".gbar")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if ((e.target as Element | null)?.closest?.(".gbar")) e.preventDefault();
          }}
        >
          <SheetTitle className="px-2 pt-2.5 pb-2 text-h1 font-semibold tracking-[-0.4px] text-text">Tú</SheetTitle>

          {principales.length > 0 && (
            <FilasHoja items={principales} pathname={pathname} pendientes={pendientes} onIr={() => setAbierta(false)} />
          )}
          {admin.length > 0 && (
            <>
              <h3 className="px-3 pt-3 pb-1 text-meta font-semibold text-faint">Administración</h3>
              <FilasHoja items={admin} pathname={pathname} pendientes={pendientes} onIr={() => setAbierta(false)} />
            </>
          )}

          <div className="mt-2 flex items-center gap-3 border-t border-line px-2 pt-3 pb-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-fill text-body font-semibold text-white">
              {iniciales(profile.nombre)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-title font-semibold text-text">{profile.nombre}</span>
              <span className="text-meta text-faint">{ROL[profile.rol] ?? profile.rol}</span>
            </span>
            <ThemeToggle sobre="claro" />
          </div>
          <div className="flex min-h-12 items-center gap-3 px-2 pb-2">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body font-medium text-text">Avisos</span>
              <span className="text-meta text-faint">Recordatorio para cerrar el día</span>
            </span>
            <ActivarAvisos sobre="claro" />
          </div>
          <form action={signOutAction} className="px-1">
            <Button type="submit" variant="outline" className="w-full">
              <SignOut />
              Cerrar sesión
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Globo({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="gbar__globo" aria-hidden>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Renglones de la hoja: 48 de alto y 17 px; la pantalla abierta en pastilla. */
function FilasHoja({
  items,
  pathname,
  pendientes,
  onIr,
}: {
  items: NavItem[];
  pathname: string;
  pendientes: (href: string) => number;
  onIr: () => void;
}) {
  return (
    <nav className="flex flex-col">
      {items.map((item) => {
        const Icono = item.icon;
        const activo = isActive(pathname, item.href);
        const n = pendientes(item.href);
        return (
          <Item
            key={item.href}
            asChild
            className={cn("min-h-12 flex-nowrap gap-3.5 px-3 py-0", activo && "bg-menu-activo [a]:hover:bg-menu-activo")}
          >
            <Link
              href={item.href}
              // Soltar el foco antes de cambiar de pantalla: si React borra el
              // botón con el foco puesto, el navegador recalcula la pantalla nueva.
              onClick={() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
                onIr();
              }}
              aria-current={activo ? "page" : undefined}
            >
              <ItemMedia>
                <Icono size={21} className={activo ? "text-accent" : "text-muted"} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className={cn("truncate text-[17px]", activo ? "font-semibold" : "font-normal")}>
                  {item.label}
                </ItemTitle>
              </ItemContent>
              {n > 0 && (
                <ItemActions>
                  <span className="tnum text-body font-medium text-faint">{n}</span>
                </ItemActions>
              )}
            </Link>
          </Item>
        );
      })}
    </nav>
  );
}
