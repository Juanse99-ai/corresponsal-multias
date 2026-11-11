"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsDownUp,
  Bell,
  Calculator,
  ChartLineUp,
  DeviceMobile,
  House,
  Lock,
  LockKey,
  MagnifyingGlass,
  SignOut,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivarAvisos } from "@/components/push/activar-avisos";
import { signOutAction } from "@/app/login/actions";
import { NAV, isActive, type NavItem } from "@/components/shell/nav-items";
import { buildAvisos } from "@/components/shell/top-header";
import { iniciales } from "@/components/shell/riel-panel";
import { EVENTO_BUSCAR, decidirChica, esArrastre, indiceEnBarra } from "@/lib/barra";
import { useInstalar } from "@/lib/instalar";
import { aplicarVidrio, leerVidrio, mapaRefraccion, refraccionDisponible } from "@/lib/vidrio";
import { ControlVidrio } from "@/components/shell/control-vidrio";
import { VentanaClaveCaja } from "@/components/shell/clave-caja";
import { bloquear } from "@/app/caja/actions";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";

const ROL: Record<Rol, string> = { admin: "Administrador", operador: "Operador" };

/**
 * Los botones de la barra (como en la app del taller). Uno con una sola
 * pantalla navega directo; uno con varias sube una hoja con ellas. "Tú" va
 * siempre al final. Lo que ve cada rol sale de NAV (el operador no tiene
 * Reportes).
 */
const BOTONES: { id: string; nombre: string; titulo: string; icon: Icon; hrefs: string[] }[] = [
  { id: "inicio", nombre: "Inicio", titulo: "Inicio", icon: House, hrefs: ["/panel"] },
  { id: "movimientos", nombre: "Movimientos", titulo: "Movimientos", icon: ArrowsDownUp, hrefs: ["/movimientos", "/luis", "/prestamos"] },
  { id: "cuadre", nombre: "Cuadre", titulo: "Cuadre diario", icon: Calculator, hrefs: ["/cuadre"] },
  { id: "reportes", nombre: "Reportes", titulo: "Reportes", icon: ChartLineUp, hrefs: ["/historial", "/general", "/auditoria", "/bitacora"] },
];

const esCampo = (el: EventTarget | Element | null) =>
  el instanceof Element &&
  el.matches(
    'input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=file],[type=range]),textarea,select,[contenteditable="true"]',
  );

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Lente = { l: number; w: number; bw: number; i: number; fase: "entra" | "mueve" | "sale"; sx: number; sy: number };
type Gesto = { x0: number; i: number; arrastrando: boolean; ux: number; ut: number; moviendo: boolean; iPintado: number };

/**
 * Barra de abajo del celular, la de la app del taller: cápsula flotante de
 * vidrio (Liquid Glass de iOS 26) con hasta 5 botones de igual ancho, ícono de
 * 26 y nombre de 10, y a la derecha el círculo de Buscar.
 * - Una sola pastilla se desliza al botón activo (gota al llegar).
 * - Se encoge al bajar la página y vuelve al subir; crece un poco con el dedo.
 * - Al arrastrar el dedo sale la lupa de vidrio; al soltar abre ese botón.
 * - Mientras se escribe, baja y desaparece.
 * - En Chromium el borde refracta el fondo (lib/vidrio.ts); en Safari queda
 *   el vidrio esmerilado.
 */
export function BarraAbajo({
  profile,
  isAdmin,
  pathname,
  resumen,
  equipo = false,
}: {
  profile: { nombre: string; rol: Rol };
  isAdmin: boolean;
  pathname: string;
  resumen: HeaderResumen;
  /** Equipo de caja autorizado: la hoja Tú ofrece Bloquear. */
  equipo?: boolean;
}) {
  const router = useRouter();
  const [claveAbierta, setClaveAbierta] = useState(false);
  // La hoja abierta queda atada a la pantalla en que se abrió: al navegar por
  // fuera de la barra (avisos, buscador, un enlace) se cierra sola.
  const [hoja, setHoja] = useState<{ id: string; en: string } | null>(null);
  const abierta = hoja && hoja.en === pathname ? hoja.id : null;
  const [escribiendo, setEscribiendo] = useState(false);
  const [chica, setChica] = useState(false);
  const [lente, setLente] = useState<Lente | null>(null);
  const [ancho, setAncho] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const pilRef = useRef<HTMLSpanElement>(null);
  const lenteRef = useRef<HTMLSpanElement>(null);
  const lupaRef = useRef<HTMLSpanElement>(null);
  const gesto = useRef<Gesto | null>(null);
  // El clic que llega justo después de soltar un arrastre no cuenta.
  const sinClickHasta = useRef(0);
  const relojLente = useRef(0);

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);
  const botones = BOTONES.map((b) => ({
    ...b,
    items: b.hrefs.map((h) => items.find((i) => i.href === h)).filter((i): i is NavItem => !!i),
  })).filter((b) => b.items.length > 0);
  // Una pantalla nueva que no esté en ningún botón no se pierde: va en Tú.
  const sueltos = items.filter((i) => !botones.some((b) => b.items.includes(i)));

  // Pendientes: el cuadre con un aviso urgente del día y los préstamos.
  const cuadreUrgente = useMemo(
    () => buildAvisos(resumen).some((a) => a.href === "/cuadre" && (a.tone === "danger" || a.tone === "warn")),
    [resumen],
  );
  const pendientes = (href: string) =>
    href === "/prestamos" ? resumen.prestamosCount : href === "/cuadre" && cuadreUrgente ? 1 : 0;

  const n = botones.length + 1;
  const iTu = botones.length;
  const iDeHoja = abierta === "tu" ? iTu : botones.findIndex((b) => b.id === abierta);
  const iPagina = botones.findIndex((b) => b.items.some((i) => isActive(pathname, i.href)));
  const iActiva = iDeHoja >= 0 ? iDeHoja : iPagina >= 0 ? iPagina : sueltos.some((i) => isActive(pathname, i.href)) ? iTu : -1;
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

  // La transparencia que eligió quien usa este teléfono (hoja Tú).
  useEffect(() => aplicarVidrio(leerVidrio()), []);

  // Refracción del borde: solo en Chromium (los demás no dibujan un filtro
  // SVG sobre el fondo). El mapa sigue el ancho real de la cápsula.
  useEffect(() => {
    if (!refraccionDisponible()) return;
    document.documentElement.classList.add("vidrio-refracta");
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => setAncho(nav.offsetWidth));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // Gota: la pastilla se aclara y se estira al llegar a otro botón, y se
  // asienta más despacio. Sin gota con reducir movimiento.
  const iAntes = useRef(iActiva);
  useEffect(() => {
    if (iAntes.current === iActiva) return;
    const primero = iAntes.current < 0;
    iAntes.current = iActiva;
    const pil = pilRef.current;
    if (!pil || primero || quieto()) return;
    pil.classList.add("gbar__pil--gota");
    const reloj = window.setTimeout(() => pil.classList.remove("gbar__pil--gota"), 120);
    return () => clearTimeout(reloj);
  }, [iActiva]);

  const alternar = (id: string, abrirSiempre = false) =>
    setHoja((h) => (!abrirSiempre && h?.id === id && h.en === pathname ? null : { id, en: pathname }));

  // abrirSiempre: al soltar un arrastre sobre un grupo se abre aunque ya estuviera.
  const tocar = (i: number, abrirSiempre = false) => {
    if (i === iTu) return alternar("tu", abrirSiempre);
    const b = botones[i];
    if (b.items.length > 1) return alternar(b.id, abrirSiempre);
    setHoja(null);
    router.push(b.items[0].href);
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
            <Globo n={sueltos.reduce((t, it) => t + pendientes(it.href), 0)} />
          </span>
          <span className="gbar__t">Tú</span>
        </>
      );
    }
    const b = botones[i];
    const Icono = b.icon;
    return (
      <>
        <span className="gbar__ic">
          <Icono weight={elegida === i ? "bold" : "regular"} />
          <Globo n={b.items.reduce((t, it) => t + pendientes(it.href), 0)} />
        </span>
        <span className="gbar__t">{b.nombre}</span>
      </>
    );
  };

  const grupo = botones.find((b) => b.id === abierta);
  const cerrar = () => setHoja(null);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Navegación principal"
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
        {botones.map((b, i) => {
          const pagina = b.items.some((it) => isActive(pathname, it.href));
          const comun = {
            variant: "ghost" as const,
            className: "gbar__b",
            "data-sobre": elegida === i || undefined,
            "data-activo": iActiva === i || undefined,
          };
          // Una sola pantalla: enlace directo, sin hoja.
          if (b.items.length === 1) {
            const it = b.items[0];
            return (
              <Button key={b.id} asChild {...comun}>
                <Link
                  href={it.href}
                  // Sin el arrastre nativo del enlace: cancelaría la lupa al correr el dedo.
                  draggable={false}
                  aria-label={b.titulo}
                  aria-current={pagina ? "page" : undefined}
                  onClick={(e) => {
                    if (e.timeStamp < sinClickHasta.current) {
                      e.preventDefault();
                      return;
                    }
                    cerrar();
                  }}
                >
                  {contenido(i)}
                </Link>
              </Button>
            );
          }
          return (
            <Button
              key={b.id}
              {...comun}
              aria-label={b.titulo}
              aria-haspopup="dialog"
              aria-expanded={abierta === b.id}
              aria-current={pagina ? "page" : undefined}
              onClick={(e) => {
                if (e.timeStamp < sinClickHasta.current) return;
                tocar(i);
              }}
            >
              {contenido(i)}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          className="gbar__b"
          data-sobre={elegida === iTu || undefined}
          data-activo={iActiva === iTu || undefined}
          aria-label="Tú: tu cuenta"
          aria-haspopup="dialog"
          aria-expanded={abierta === "tu"}
          onClick={(e) => {
            if (e.timeStamp < sinClickHasta.current) return;
            tocar(iTu);
          }}
        >
          {contenido(iTu)}
        </Button>

        {/* Una sola pastilla que se desliza al botón activo. Va después de
            los botones para que :active de un botón la alcance con ~. */}
        <span
          aria-hidden
          className={cn("gbar__pista", (iActiva < 0 || tocando) && "gbar__pista--oculta")}
          style={{ "--i": Math.max(0, iActiva) } as React.CSSProperties}
        >
          <span ref={pilRef} className="gbar__pil" />
        </span>

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

      {/* El círculo de Buscar: abre el buscador de la cabecera (día o persona). */}
      <Button
        variant="ghost"
        className={cn("gbar-buscar", escribiendo && "gbar--abajo", chica && !abierta && !tocando && "gbar--chica")}
        aria-label="Buscar día o persona"
        onClick={() => {
          cerrar();
          window.dispatchEvent(new Event(EVENTO_BUSCAR));
        }}
      >
        <MagnifyingGlass />
      </Button>

      {ancho > 0 && <FiltrosVidrio ancho={ancho} />}

      <Sheet open={!!abierta} onOpenChange={(v) => !v && cerrar()}>
        <SheetContent
          side="barra"
          aria-describedby={undefined}
          // El foco va a la hoja, no al botón de cerrar (sacaría su tooltip).
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus?.();
          }}
          // Tocar la barra con la hoja arriba no la cierra: lo decide el botón.
          onPointerDownOutside={(e) => {
            if ((e.target as Element | null)?.closest?.(".gbar")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if ((e.target as Element | null)?.closest?.(".gbar")) e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between gap-3 px-2 pt-2.5 pb-2">
            <SheetTitle className="text-[22px] leading-tight font-medium tracking-[-0.4px] text-text">
              {grupo ? grupo.titulo : "Tú"}
            </SheetTitle>
            <IconButton label="Cerrar" forma="gris" size="icon-sm" onClick={cerrar}>
              <X size={16} weight="bold" />
            </IconButton>
          </div>

          {grupo && <FilasHoja items={grupo.items} pathname={pathname} pendientes={pendientes} onIr={cerrar} />}

          {abierta === "tu" && (
            <HojaTu
              profile={profile}
              sueltos={sueltos}
              pathname={pathname}
              pendientes={pendientes}
              onIr={cerrar}
              equipo={equipo}
              onClave={() => {
                cerrar();
                setClaveAbierta(true);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <VentanaClaveCaja open={claveAbierta} onOpenChange={setClaveAbierta} />
    </>
  );
}

/** Lo de la hoja Tú: quién entró, tema, avisos, instalar la app y cerrar sesión. */
function HojaTu({
  profile,
  sueltos,
  pathname,
  pendientes,
  onIr,
  equipo,
  onClave,
}: {
  profile: { nombre: string; rol: Rol };
  sueltos: NavItem[];
  pathname: string;
  pendientes: (href: string) => number;
  onIr: () => void;
  equipo: boolean;
  onClave: () => void;
}) {
  const { modo, instalar } = useInstalar();
  return (
    <>
      <div className="flex items-center gap-3 px-2 pt-1 pb-2.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-fill text-body font-semibold text-accent-ink">
          {iniciales(profile.nombre)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-title font-semibold text-text">{profile.nombre}</span>
          <span className="text-meta text-faint">{ROL[profile.rol] ?? profile.rol}</span>
        </span>
        <ThemeToggle sobre="claro" />
      </div>

      {sueltos.length > 0 && <FilasHoja items={sueltos} pathname={pathname} pendientes={pendientes} onIr={onIr} />}

      <div className="border-t border-line pt-1">
        <ControlVidrio />
      </div>

      <div className="flex min-h-12 items-center gap-3 border-t border-line px-2 py-1.5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center text-muted">
          <Bell size={21} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-text">Avisos</span>
          <span className="text-meta text-faint">Cierre del día</span>
        </span>
        <ActivarAvisos sobre="claro" />
      </div>

      {modo && (
        <div className="flex min-h-12 items-center gap-3 px-2 pb-2">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center text-muted">
            <DeviceMobile size={21} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-text">Instalar la app</span>
            {modo === "iphone" && <span className="text-meta text-faint">Compartir, luego Agregar a inicio</span>}
          </span>
          {modo === "boton" && (
            <Button size="sm" variant="secondary" onClick={instalar}>
              Instalar
            </Button>
          )}
        </div>
      )}

      <div className="flex min-h-12 items-center gap-3 border-t border-line px-2 py-1.5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center text-muted">
          <LockKey size={21} />
        </span>
        <span className="min-w-0 flex-1 text-body font-medium text-text">Clave de caja</span>
        <Button size="sm" variant="secondary" onClick={onClave}>
          Abrir
        </Button>
      </div>

      {/* En la caja: bloquear deja la app en la pantalla de clave para el siguiente. */}
      {equipo && (
        <form action={bloquear} className="px-1 pt-1">
          <Button type="submit" className="w-full">
            <Lock weight="bold" />
            Bloquear
          </Button>
        </form>
      )}

      <form action={signOutAction} className="px-1 pt-1">
        <Button type="submit" variant="outline" className="w-full">
          <SignOut />
          Cerrar sesión
        </Button>
      </form>
    </>
  );
}

/**
 * Los filtros de refracción (lib/vidrio.ts) de la cápsula y del círculo de
 * Buscar, en un SVG sin tamaño. El borde refracta con un poco de aberración
 * de color: cada canal se desvía un poco distinto, como en un vidrio real.
 * La escala es positiva: la orilla toma el fondo de más adentro (lo comprime,
 * como una lente); hacia afuera no hay fondo y saldrían rayas de colores.
 */
function FiltrosVidrio({ ancho }: { ancho: number }) {
  const h = 61;
  const filtro = (id: string, w: number, escala: number) => (
    <filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feImage href={mapaRefraccion(w, h, h / 2, 16)} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="mapa" />
      <feDisplacementMap in="SourceGraphic" in2="mapa" scale={escala} xChannelSelector="R" yChannelSelector="B" result="dR" />
      <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feDisplacementMap in="SourceGraphic" in2="mapa" scale={escala * 1.03} xChannelSelector="R" yChannelSelector="B" result="dG" />
      <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feDisplacementMap in="SourceGraphic" in2="mapa" scale={escala * 1.06} xChannelSelector="R" yChannelSelector="B" result="dB" />
      <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feBlend in="r" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b" mode="screen" result="rgb" />
      <feGaussianBlur in="rgb" stdDeviation="1.2" />
    </filter>
  );
  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
      {filtro("vidrio-gbar", ancho, 56)}
      {filtro("vidrio-gbar-buscar", h, 44)}
    </svg>
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
    <nav className="flex flex-col pb-1">
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
