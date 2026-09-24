"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    // Barra flotante de vidrio: el contenido pasa por debajo al hacer scroll.
    <header className="sticky top-0 z-20 px-2 pt-2 sm:px-4 lg:px-6" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <div className="lg-panel relative mx-auto flex max-w-[1240px] items-center justify-between gap-3 rounded-[1.6rem] px-2 py-1.5 sm:px-3">
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <Button variant="secondary" size="sm" onClick={onOpenMenu} aria-label="Abrir menú" className="w-10 px-0 sm:w-auto sm:px-4">
          <List size={18} weight="bold" />
          <span className="hidden sm:inline">Menú</span>
        </Button>
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
      <Button
        variant="secondary"
        size="icon"
        onClick={() => {
          setMovil(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="Buscar día o persona"
        className={cn("sm:hidden", movil && "invisible")}
      >
        <MagnifyingGlass size={18} />
      </Button>

    <form
      onSubmit={onSubmit}
      className={cn(
        "relative",
        movil ? "absolute inset-x-1.5 top-1.5 z-30 sm:static sm:inset-auto" : "hidden sm:block",
      )}
    >
      <Popover open={open && !!q.trim()}>
      <PopoverAnchor asChild>
      <InputGroup className="rounded-full sm:h-10 sm:w-[240px]">
        <InputGroupAddon>
          <MagnifyingGlass className="text-faint" />
        </InputGroupAddon>
        <InputGroupInput
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
          className="text-base placeholder:text-faint sm:text-[0.82rem]"
        />
        {movil && (
          <InputGroupAddon align="inline-end" className="sm:hidden">
            <InputGroupButton size="icon-sm" aria-label="Cerrar buscador" title="Cerrar buscador" onClick={cerrarMovil}>
              <X weight="bold" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        sideOffset={8}
        // El foco se queda en el campo: se sigue escribiendo mientras sale la lista.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
        className="w-[min(20rem,80vw)] overflow-hidden p-0"
      >
            {!hayResultados ? (
              <p className="px-4 py-3 text-[0.8rem] text-faint">Escribe una fecha (17/06) o el nombre de una persona.</p>
            ) : (
              <ul className="flex flex-col py-1">
                {fechaISO && (
                  <li>
                    <Button variant="ghost" onClick={() => irAFecha(fechaISO)} className="h-auto min-h-11 w-full justify-start gap-2.5 rounded-none px-4 py-2.5 text-left font-normal hover:bg-surface-2/70">
                      <CalendarBlank size={16} className="text-accent" />
                      <span className="flex-1 text-[0.84rem] text-text">Ver el día {formatFecha(fechaISO)}</span>
                      <ArrowRight size={14} className="text-faint" />
                    </Button>
                  </li>
                )}
                {personasMatch.map((p) => (
                  <li key={p}>
                    <Button variant="ghost" onClick={irAPersona} className="h-auto min-h-11 w-full justify-start gap-2.5 rounded-none px-4 py-2.5 text-left font-normal hover:bg-surface-2/70">
                      <HandCoins size={16} className="text-accent" />
                      <span className="flex-1 text-[0.84rem] text-text">{p}</span>
                      <span className="text-[0.7rem] text-faint">Préstamos</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
      </PopoverContent>
      </Popover>
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <Button
        variant="secondary"
        size="icon"
        title="Avisos"
        aria-label={avisos.length ? `Avisos (${avisos.length})` : "Avisos"}
      >
        <span className="relative inline-flex">
          <Bell size={18} weight={avisos.length ? "fill" : "regular"} />
          {avisos.length > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute -right-1 -top-0.5 h-2 w-2 rounded-full ring-2 ring-bg",
                urgentes ? "bg-danger" : "bg-accent",
              )}
            />
          )}
        </span>
      </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[min(22rem,84vw)] overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
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
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70"
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
      </PopoverContent>
    </Popover>
  );
}
