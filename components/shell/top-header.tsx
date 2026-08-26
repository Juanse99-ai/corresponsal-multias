"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlass,
  Bell,
  Warning,
  CheckCircle,
  CalendarBlank,
  HandCoins,
  ArrowRight,
  List,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaLarga, hoyISO, formatFecha, anioBogota } from "@/lib/format";
import type { HeaderResumen } from "@/lib/queries";

type Tone = "danger" | "warn" | "info" | "ok";

export interface Aviso {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
}

/** Construye la lista de avisos del header a partir del resumen del día. */
export function buildAvisos(resumen: HeaderResumen): Aviso[] {
  const out: Aviso[] = [];
  const c = resumen.cuadreHoy;
  if (!c) {
    out.push({
      id: "cuadre",
      tone: resumen.tarde ? "danger" : "warn",
      title: resumen.tarde ? "Falta cerrar el día" : "Cuadre de hoy sin abrir",
      detail: resumen.tarde ? "Ya es tarde y el cuadre sigue sin abrir." : "Ábrelo cuando tengas la tirilla.",
      href: "/cuadre",
    });
  } else if (c.total_tirilla === 0) {
    // Sin tirilla escrita el saldo es un número provisional, no un descuadre.
    out.push({
      id: "cuadre",
      tone: "info",
      title: "Falta la tirilla de hoy",
      detail: "Escribe el total de la tirilla para ver si el día cuadra.",
      href: "/cuadre",
    });
  } else if (Math.round(c.saldo_final) !== 0) {
    const sobra = c.saldo_final < 0;
    out.push({
      id: "cuadre",
      tone: "danger",
      title: "Descuadre de hoy",
      detail: `${sobra ? "Sobran" : "Faltan"} ${formatCOP(Math.abs(c.saldo_final))} por justificar.`,
      href: "/cuadre",
    });
  } else if (c.estado !== "cerrado" && resumen.tarde) {
    out.push({
      id: "cerrar",
      tone: "warn",
      title: "Recuerda cerrar el día",
      detail: "Ya cuadra; ciérralo para dejarlo en firme.",
      href: "/cuadre",
    });
  }
  if (resumen.prestamosCount > 0) {
    out.push({
      id: "prestamos",
      tone: "info",
      title: `${resumen.prestamosCount} préstamo${resumen.prestamosCount === 1 ? "" : "s"} pendiente${resumen.prestamosCount === 1 ? "" : "s"}`,
      detail: `${formatCOP(resumen.prestamosTotal)} por cobrar al fondo.`,
      href: "/prestamos",
    });
  }
  return out;
}

export function avisosUrgentes(avisos: Aviso[]): number {
  return avisos.filter((a) => a.tone === "danger" || a.tone === "warn").length;
}

const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

/** Solo devuelve la fecha si el día existe en ese mes (31/02 no vale). */
function fechaValida(y: string, mo: string, d: string): string | null {
  const iso = `${y}-${mo}-${d}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Intenta leer una fecha de varios formatos y devolverla en ISO. */
function parseFechaISO(raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  let m = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return fechaValida(m[1], m[2].padStart(2, "0"), m[3].padStart(2, "0"));
  m = q.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : String(anioBogota());
    return fechaValida(y, mo, d);
  }
  m = q.match(/^(\d{1,2})\s+([a-zé]{3})\.?(?:\s+(\d{4}))?$/);
  if (m && MESES[m[2]]) {
    const d = m[1].padStart(2, "0");
    const mo = String(MESES[m[2]]).padStart(2, "0");
    const y = m[3] ?? String(anioBogota());
    return fechaValida(y, mo, d);
  }
  return null;
}

export function TopHeader({
  resumen,
  isAdmin,
  onOpenMenu,
}: {
  resumen: HeaderResumen;
  isAdmin: boolean;
  onOpenMenu: () => void;
}) {
  const avisos = useMemo(() => buildAvisos(resumen), [resumen]);
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg/80 px-3 py-2.5 backdrop-blur-xl sm:px-6 lg:px-8 relative">
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-3 pr-3.5 text-[0.84rem] font-medium text-text transition-colors hover:bg-surface-2"
        >
          <List size={18} weight="bold" />
          <span className="hidden sm:inline">Menú</span>
        </button>
        <Link href="/panel" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="hidden text-sm font-semibold tracking-tight text-text sm:block">Barrio Centro Sabanalarga 18</span>
        </Link>
        <span className="ml-1 hidden text-[0.82rem] text-muted lg:block">{formatFechaLarga(hoyISO())}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <HeaderSearch personas={isAdmin ? resumen.personas : []} />
        <HeaderAvisos avisos={avisos} urgentes={avisosUrgentes(avisos)} />
      </div>
    </header>
  );
}

function HeaderSearch({ personas }: { personas: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // En celular el buscador vive detrás de una lupa y se abre a todo el ancho.
  const [movil, setMovil] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fechaISO = parseFechaISO(q);
  const personasMatch = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 1) return [];
    return personas.filter((p) => p.toLowerCase().includes(t)).slice(0, 5);
  }, [q, personas]);

  const hayResultados = !!fechaISO || personasMatch.length > 0;

  function cerrarMovil() {
    setMovil(false);
    setOpen(false);
    setQ("");
  }

  function irAFecha(iso: string) {
    setOpen(false);
    setMovil(false);
    setQ("");
    router.push(`/cuadre?fecha=${iso}`);
  }
  function irAPersona() {
    setOpen(false);
    setMovil(false);
    setQ("");
    router.push("/prestamos");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fechaISO) return irAFecha(fechaISO);
    if (personasMatch.length > 0) return irAPersona();
  }

  return (
    <>
      {/* Celular: lupa de 44x44. El buscador completo se abre encima del encabezado. */}
      <button
        type="button"
        onClick={() => {
          setMovil(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="Buscar día o persona"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 sm:hidden",
          movil && "invisible",
        )}
      >
        <MagnifyingGlass size={18} />
      </button>

    <form
      onSubmit={onSubmit}
      className={cn(
        "relative",
        movil ? "absolute inset-x-3 top-2.5 z-30 sm:static sm:inset-auto" : "hidden sm:block",
      )}
    >
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-[0.7rem] border bg-surface px-3 transition-colors sm:h-10 sm:w-[240px]",
          open ? "border-accent/50 bg-surface" : "border-line",
        )}
      >
        <MagnifyingGlass size={16} className="shrink-0 text-faint" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Buscar día, persona…"
          aria-label="Buscar día o persona"
          /* text-base en celular: con menos de 16px iOS hace zoom al enfocar. */
          className="w-full min-w-0 bg-transparent text-base text-text outline-none placeholder:text-faint sm:text-[0.82rem]"
        />
        {movil && (
          <button
            type="button"
            onClick={cerrarMovil}
            aria-label="Cerrar buscador"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:text-text sm:hidden"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && q.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-12 z-30 w-[min(20rem,80vw)] overflow-hidden rounded-[1rem] border border-line bg-surface shadow-[0_18px_40px_-18px_oklch(0.4_0.07_258/0.35)]"
            onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
          >
            {!hayResultados ? (
              <p className="px-4 py-3 text-[0.8rem] text-faint">Escribe una fecha (17/06) o el nombre de una persona.</p>
            ) : (
              <ul className="flex flex-col py-1">
                {fechaISO && (
                  <li>
                    <button
                      type="button"
                      onClick={() => irAFecha(fechaISO)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <CalendarBlank size={16} className="text-accent" />
                      <span className="flex-1 text-[0.84rem] text-text">Ver el día {formatFecha(fechaISO)}</span>
                      <ArrowRight size={14} className="text-faint" />
                    </button>
                  </li>
                )}
                {personasMatch.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={irAPersona}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <HandCoins size={16} className="text-accent" />
                      <span className="flex-1 text-[0.84rem] text-text">{p}</span>
                      <span className="text-[0.7rem] text-faint">Préstamos</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
    </>
  );
}

const TONE: Record<Tone, { wrap: string; icon: typeof Warning }> = {
  danger: { wrap: "bg-danger-soft text-danger", icon: Warning },
  // Urgente e informativo tenían el mismo fondo y color: no se distinguían.
  warn: { wrap: "bg-danger-soft/60 text-danger", icon: Warning },
  info: { wrap: "bg-accent-soft text-accent-strong", icon: HandCoins },
  ok: { wrap: "bg-success-soft text-success", icon: CheckCircle },
};

export function HeaderAvisos({ avisos, urgentes }: { avisos: Aviso[]; urgentes: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        title="Avisos" aria-label="Avisos"
        className="relative flex h-10 w-10 items-center justify-center rounded-[0.7rem] border border-line bg-surface text-muted transition-colors hover:text-text"
      >
        <Bell size={18} weight={avisos.length ? "fill" : "regular"} />
        {avisos.length > 0 && (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-bg",
              urgentes ? "bg-danger" : "bg-accent",
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-30 w-[min(22rem,84vw)] overflow-hidden rounded-[1rem] border border-line bg-surface shadow-[0_18px_40px_-18px_oklch(0.4_0.07_258/0.35)]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[0.84rem] font-semibold text-text">Avisos</p>
              <span className="text-[0.72rem] text-faint">{avisos.length}</span>
            </div>
            {avisos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle size={22} weight="fill" className="text-success" />
                <p className="text-[0.84rem] text-muted">Todo al día. Sin pendientes.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {avisos.map((a) => {
                  const T = TONE[a.tone];
                  return (
                    <li key={a.id}>
                      <Link
                        href={a.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", T.wrap)}>
                          <T.icon size={15} weight="fill" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.85rem] font-medium text-text">{a.title}</span>
                          <span className="block text-[0.76rem] text-faint">{a.detail}</span>
                        </span>
                        <ArrowRight size={14} className="mt-1 shrink-0 text-faint" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
