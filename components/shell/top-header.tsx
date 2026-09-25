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
import { IconButton } from "@/components/ui/icon-button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
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
      detail: `Le deben ${formatCOP(resumen.prestamosTotal)} al fondo.`,
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
    // Barra de lado a lado, como en iOS: el contenido pasa por debajo al hacer scroll.
    <header className="barra-material sticky top-0 z-20 border-b border-line/80" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="relative mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-3 px-1.5 sm:px-4 lg:px-6">
      <div className="flex items-center gap-1.5 sm:gap-3">
        <Button variant="ghost" onClick={onOpenMenu} aria-label="Abrir menú" className="w-11 px-0 sm:w-auto sm:px-3">
          <List size={20} />
          <span className="hidden sm:inline">Menú</span>
        </Button>
        <Link href="/panel" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="hidden text-sm font-semibold tracking-tight text-text sm:block">Barrio Centro Sabanalarga 18</span>
        </Link>
        <span className="ml-1 hidden text-[0.82rem] text-muted lg:block">{formatFechaLarga(hoyISO())}</span>
      </div>
      <div className="flex items-center gap-1">
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
      <IconButton
        label="Buscar día o persona"
        onClick={() => {
          setMovil(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn("sm:hidden", movil && "invisible")}
      >
        <MagnifyingGlass size={18} />
      </IconButton>

    <form
      onSubmit={onSubmit}
      className={cn(
        "relative",
        movil ? "absolute inset-x-1.5 top-1.5 z-30 sm:static sm:inset-auto" : "hidden sm:block",
      )}
    >
      <Popover open={open && !!q.trim()}>
      <PopoverAnchor asChild>
      {/* Abierto en el celular va encima de la barra: fondo sólido para que no se transparente la campana. */}
      <InputGroup className={cn("rounded-full sm:h-10 sm:w-[240px]", movil && "bg-surface dark:bg-surface sm:bg-surface-2/60 sm:dark:bg-input/30")}>
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
            <InputGroupButton size="icon-sm" aria-label="Cerrar buscador" onClick={cerrarMovil}>
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
              <ItemGroup className="py-1">
                {fechaISO && (
                  <Item size="sm" asChild className={filaResultado}>
                    <Button variant="ghost" onClick={() => irAFecha(fechaISO)}>
                      <ItemMedia>
                        <CalendarBlank size={16} className="text-accent" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-[0.84rem] font-normal text-text">Ver el día {formatFecha(fechaISO)}</ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        <ArrowRight size={14} className="text-faint" />
                      </ItemActions>
                    </Button>
                  </Item>
                )}
                {personasMatch.map((p) => (
                  <Item key={p} size="sm" asChild className={filaResultado}>
                    <Button variant="ghost" onClick={irAPersona}>
                      <ItemMedia>
                        <HandCoins size={16} className="text-accent" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-[0.84rem] font-normal text-text">{p}</ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        <span className="text-[0.7rem] text-faint">Préstamos</span>
                      </ItemActions>
                    </Button>
                  </Item>
                ))}
              </ItemGroup>
            )}
      </PopoverContent>
      </Popover>
    </form>
    </>
  );
}

// Fila de resultado del buscador: <Item> sobre un <Button> fantasma a todo el ancho.
const filaResultado =
  "h-auto min-h-11 w-full flex-nowrap justify-start rounded-none border-0 text-left font-normal hover:bg-surface-2/70";

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
      <IconButton label={avisos.length ? `Avisos (${avisos.length})` : "Avisos"}>
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
      </IconButton>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[min(22rem,84vw)] overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[0.84rem] font-semibold text-text">Avisos</p>
              <span className="text-[0.72rem] text-faint">{avisos.length}</span>
            </div>
            <Separator className="bg-line/60" />
            {avisos.length === 0 ? (
              <Empty className="gap-2 px-4 py-8 md:px-4 md:py-8">
                <EmptyHeader className="gap-2">
                  <EmptyMedia className="mb-0">
                    <CheckCircle size={22} weight="fill" className="text-success" />
                  </EmptyMedia>
                  <EmptyDescription className="text-[0.84rem] text-muted">No hay avisos.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ItemGroup>
                {avisos.map((a) => {
                  const T = TONE[a.tone];
                  return (
                    <Item key={a.id} size="sm" asChild className="flex-nowrap items-start gap-3 rounded-none border-0 hover:bg-surface-2/70">
                      <Link href={a.href} onClick={() => setOpen(false)}>
                        <ItemMedia className={cn("size-8 rounded-full", T.wrap)}>
                          <T.icon size={15} weight="fill" />
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0">
                          <ItemTitle className="text-[0.85rem] font-medium text-text">{a.title}</ItemTitle>
                          <ItemDescription className="text-[0.76rem] text-faint">{a.detail}</ItemDescription>
                        </ItemContent>
                        <ItemActions className="mt-1 self-start">
                          <ArrowRight size={14} className="shrink-0 text-faint" />
                        </ItemActions>
                      </Link>
                    </Item>
                  );
                })}
              </ItemGroup>
            )}
      </PopoverContent>
    </Popover>
  );
}
