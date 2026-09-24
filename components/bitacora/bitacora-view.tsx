"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  PencilSimple,
  Trash,
  ShieldCheck,
  MagnifyingGlass,
  CaretDown,
  ArrowRight,
  DownloadSimple,
  Calculator,
  Wallet,
  ArrowsDownUp,
  HandCoins,
  Paperclip,
  Vault,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha, formatHoraISO } from "@/lib/format";
import type { AuditEntry } from "@/lib/queries";

type AccionTipo = "INSERT" | "UPDATE" | "DELETE";

const ACCION: Record<string, { verbo: string; color: string; bg: string; icon: Icon }> = {
  INSERT: { verbo: "registró", color: "text-success", bg: "bg-success-soft", icon: Plus },
  UPDATE: { verbo: "editó", color: "text-accent-strong", bg: "bg-accent-soft", icon: PencilSimple },
  DELETE: { verbo: "borró", color: "text-danger", bg: "bg-danger-soft", icon: Trash },
};

const TABLA_TEXTO: Record<string, string> = {
  corr_cuadres: "el cuadre",
  corr_consignaciones_luis: "una consignación de Luis",
  corr_compensaciones_luis: "una compensación de Luis",
  corr_movimientos: "un movimiento",
  corr_deudas: "un préstamo",
  corr_abonos: "un abono",
  corr_soportes: "un soporte",
  corr_general: "el control general",
  corr_mov_propios: "un movimiento propio",
};

const MODULOS: { id: string; label: string; icon: Icon; tablas: string[] }[] = [
  { id: "cuadre", label: "Cuadre", icon: Calculator, tablas: ["corr_cuadres"] },
  { id: "luis", label: "Sr. Luis", icon: Wallet, tablas: ["corr_consignaciones_luis", "corr_compensaciones_luis"] },
  { id: "movimientos", label: "Movimientos", icon: ArrowsDownUp, tablas: ["corr_movimientos"] },
  { id: "prestamos", label: "Préstamos", icon: HandCoins, tablas: ["corr_deudas", "corr_abonos"] },
  { id: "soportes", label: "Soportes", icon: Paperclip, tablas: ["corr_soportes"] },
  { id: "general", label: "Control general", icon: Vault, tablas: ["corr_general", "corr_mov_propios"] },
];
const MODULO_DE = new Map<string, string>();
for (const m of MODULOS) for (const t of m.tablas) MODULO_DE.set(t, m.id);

const CAMPO: Record<string, string> = {
  monto: "Monto",
  total_tirilla: "Total tirilla",
  persona: "Persona",
  concepto: "Concepto",
  fecha: "Fecha",
  tipo: "Tipo",
  estado: "Estado",
  hora: "Hora",
  medio: "Medio",
  nota: "Nota",
  origen: "Origen",
  convenio: "Convenio",
  abonado: "Abonado",
  cliente: "Cliente",
  saldo_final: "Saldo final",
  compensado: "Compensado",
  nequis: "Nequis",
  bancolombia: "Bancolombia",
  ret_real: "Retiros",
  recaudos: "Recaudos",
};
const MONEY = new Set([
  "monto", "total_tirilla", "abonado", "saldo_final", "compensado", "nequis", "bancolombia", "ret_real", "recaudos",
]);

function diaBogota(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function montoDe(e: AuditEntry): number | null {
  const src = (e.despues ?? e.antes) as Record<string, unknown> | null;
  if (!src) return null;
  const raw = src.monto ?? src.total_tirilla ?? null;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : null;
  return n != null && !Number.isNaN(n) ? n : null;
}

function fmtVal(campo: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (MONEY.has(campo)) {
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : formatCOP(n);
  }
  if (campo === "fecha") return formatFecha(String(v));
  return String(v);
}

interface Cambio {
  campo: string;
  antes?: string;
  despues?: string;
  valor?: string;
}

function cambiosDe(e: AuditEntry): Cambio[] {
  const antes = (e.antes ?? {}) as Record<string, unknown>;
  const despues = (e.despues ?? {}) as Record<string, unknown>;
  const out: Cambio[] = [];
  if (e.accion === "UPDATE") {
    for (const campo of Object.keys(CAMPO)) {
      const a = antes[campo];
      const d = despues[campo];
      if (a === undefined && d === undefined) continue;
      if (String(a ?? "") !== String(d ?? "")) out.push({ campo, antes: fmtVal(campo, a), despues: fmtVal(campo, d) });
    }
  } else {
    const src = e.accion === "DELETE" ? antes : despues;
    for (const campo of Object.keys(CAMPO)) {
      if (src[campo] !== undefined && src[campo] !== null && src[campo] !== "") {
        out.push({ campo, valor: fmtVal(campo, src[campo]) });
      }
    }
  }
  return out;
}

export function BitacoraView({ entries }: { entries: AuditEntry[] }) {
  const [modulo, setModulo] = useState("todos");
  const [accion, setAccion] = useState<"todas" | AccionTipo>("todas");
  const [actor, setActor] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const actores = useMemo(() => [...new Set(entries.map((e) => e.actorNombre))], [entries]);

  const filtrados = useMemo(
    () =>
      entries.filter((e) => {
        if (modulo !== "todos" && MODULO_DE.get(e.tabla) !== modulo) return false;
        if (accion !== "todas" && e.accion !== accion) return false;
        if (actor !== "todos" && e.actorNombre !== actor) return false;
        const dia = diaBogota(e.created_at);
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
        if (q.trim()) {
          const hay = `${e.actorNombre} ${TABLA_TEXTO[e.tabla] ?? e.tabla} ${JSON.stringify(e.despues ?? e.antes ?? {})}`.toLowerCase();
          if (!hay.includes(q.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [entries, modulo, accion, actor, desde, hasta, q],
  );

  const stats = useMemo(
    () => ({
      total: filtrados.length,
      INSERT: filtrados.filter((e) => e.accion === "INSERT").length,
      UPDATE: filtrados.filter((e) => e.accion === "UPDATE").length,
      DELETE: filtrados.filter((e) => e.accion === "DELETE").length,
    }),
    [filtrados],
  );

  const grupos = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtrados) {
      const d = diaBogota(e.created_at);
      const arr = map.get(d);
      if (arr) arr.push(e);
      else map.set(d, [e]);
    }
    return [...map.entries()];
  }, [filtrados]);

  const hoy = diaBogota(new Date().toISOString());
  const ayer = diaBogota(new Date(Date.now() - 86400000).toISOString());
  const labelDia = (d: string) => (d === hoy ? "Hoy" : d === ayer ? "Ayer" : formatFecha(d));

  const hayFiltro = modulo !== "todos" || accion !== "todas" || actor !== "todos" || !!desde || !!hasta || !!q;
  function limpiar() {
    setModulo("todos");
    setAccion("todas");
    setActor("todos");
    setDesde("");
    setHasta("");
    setQ("");
  }
  function toggle(id: string) {
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function exportar() {
    const XLSX = await import("xlsx");
    const rows = filtrados.map((e) => ({
      Fecha: diaBogota(e.created_at),
      Hora: formatHoraISO(e.created_at),
      Quién: e.actorNombre,
      Acción: ACCION[e.accion]?.verbo ?? e.accion,
      Qué: TABLA_TEXTO[e.tabla] ?? e.tabla,
      "Del día": e.fecha_dato ?? "",
      Monto: montoDe(e) ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bitácora");
    XLSX.writeFile(wb, `bitacora-${desde || "todo"}.xlsx`);
  }

  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
          <ShieldCheck size={20} />
        </div>
        <p className="text-sm text-muted">Aún no hay movimientos registrados.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen */}
      <Card className="grid grid-cols-2 gap-y-4 p-4 sm:grid-cols-4 sm:divide-x sm:divide-line sm:p-5">
        <Stat label="Movimientos" value={stats.total} />
        <Stat label="Registros" value={stats.INSERT} tone="success" />
        <Stat label="Ediciones" value={stats.UPDATE} tone="accent" />
        <Stat label="Borrados" value={stats.DELETE} tone="danger" />
      </Card>

      {/* Filtros */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <InputGroup className="h-10 flex-1">
            <InputGroupAddon>
              <MagnifyingGlass className="text-faint" />
            </InputGroupAddon>
            <InputGroupInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, persona, monto…"
              aria-label="Buscar en la bitácora"
            />
          </InputGroup>
          <div className="flex flex-wrap items-end gap-2">
            <Campo label="Desde">
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10 w-full min-w-0 sm:w-[8.8rem]" />
            </Campo>
            <Campo label="Hasta">
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10 w-full min-w-0 sm:w-[8.8rem]" />
            </Campo>
            <Button variant="secondary" size="sm" onClick={exportar} disabled={filtrados.length === 0} className="shrink-0">
              <DownloadSimple size={16} weight="bold" />
              Excel
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Chip active={modulo === "todos"} onClick={() => setModulo("todos")}>
            Todos
          </Chip>
          {MODULOS.map((m) => (
            <Chip key={m.id} active={modulo === m.id} onClick={() => setModulo(m.id)} icon={m.icon}>
              {m.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-[0.72rem] font-medium uppercase tracking-wide text-faint">Acción</span>
          <AccionChip tipo="todas" active={accion === "todas"} onClick={() => setAccion("todas")}>
            Todas
          </AccionChip>
          {(["INSERT", "UPDATE", "DELETE"] as const).map((t) => (
            <AccionChip key={t} tipo={t} active={accion === t} onClick={() => setAccion(t)}>
              {t === "INSERT" ? "Registró" : t === "UPDATE" ? "Editó" : "Borró"}
            </AccionChip>
          ))}
          {actores.length > 1 && (
            <>
              <span className="ml-2 text-[0.72rem] font-medium uppercase tracking-wide text-faint">Quién</span>
              <Chip active={actor === "todos"} onClick={() => setActor("todos")}>
                Todos
              </Chip>
              {actores.map((a) => (
                <Chip key={a} active={actor === a} onClick={() => setActor(a)}>
                  {a.split(/\s+/)[0]}
                </Chip>
              ))}
            </>
          )}
          {hayFiltro && (
            <Button size="sm" variant="ghost" onClick={limpiar} className="ml-auto">
              <X size={16} />
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {/* Lista agrupada por día */}
      {filtrados.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
            <MagnifyingGlass size={20} />
          </div>
          <p className="text-sm text-muted">Ningún registro con estos filtros.</p>
        </Card>
      ) : (
        grupos.map(([dia, items]) => (
          <div key={dia} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[0.8rem] font-semibold text-muted">{labelDia(dia)}</h3>
              <span className="text-[0.72rem] text-faint">{items.length} {items.length === 1 ? "movimiento" : "movimientos"}</span>
            </div>
            <Card className="p-1.5 sm:p-2">
              <ul className="flex flex-col divide-y divide-line">
                {items.map((e) => (
                  <Fila key={e.id} e={e} abierto={abiertos.has(e.id)} onToggle={() => toggle(e.id)} />
                ))}
              </ul>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}

function Fila({ e, abierto, onToggle }: { e: AuditEntry; abierto: boolean; onToggle: () => void }) {
  const acc = ACCION[e.accion] ?? { verbo: e.accion, color: "text-muted", bg: "bg-surface-2", icon: PencilSimple };
  const tabla = TABLA_TEXTO[e.tabla] ?? e.tabla;
  const monto = montoDe(e);
  const Icono = acc.icon;
  const cambios = cambiosDe(e);

  return (
    <Collapsible asChild open={abierto} onOpenChange={onToggle}>
    <li className={cn("rounded-lg", e.accion === "DELETE" && "bg-danger-soft/25")}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/45 sm:px-2.5"
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", acc.bg, acc.color)}>
          <Icono size={16} weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.88rem] text-text">
            <span className="font-semibold">{e.actorNombre}</span> <span className={acc.color}>{acc.verbo}</span> {tabla}
            {e.fecha_dato && <span className="text-muted"> del {formatFecha(e.fecha_dato)}</span>}
            {monto != null && <span className="tnum text-muted"> · {formatCOP(monto)}</span>}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap text-[0.72rem] text-faint">{formatHoraISO(e.created_at)}</span>
        <CaretDown
          size={14}
          className={cn("shrink-0 text-faint transition-transform", abierto && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="mb-2 ml-10 mr-2 rounded-card border border-line bg-surface-2/50 p-3 sm:ml-[3rem]">
              {cambios.length === 0 ? (
                <p className="text-[0.78rem] text-faint">Sin detalle adicional.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line/70">
                  {cambios.map((c) => (
                    <div key={c.campo} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-[0.78rem]">
                      <span className="shrink-0 text-muted">{CAMPO[c.campo] ?? c.campo}</span>
                      {c.valor != null ? (
                        <span className="tnum min-w-0 break-words text-right text-text">{c.valor}</span>
                      ) : (
                        <span className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                          <span className="tnum text-faint line-through">{c.antes}</span>
                          <ArrowRight size={11} className="text-faint" />
                          <span className="tnum font-medium text-text">{c.despues}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
      </CollapsibleContent>
    </li>
    </Collapsible>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "accent" | "danger" }) {
  return (
    <div className="px-4 first:pl-0">
      <p className="text-[0.72rem] text-faint">{label}</p>
      <p
        className={cn(
          "tnum mt-0.5 text-xl font-semibold",
          tone === "success" ? "text-success" : tone === "accent" ? "text-accent-strong" : tone === "danger" ? "text-danger" : "text-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
      <label className="text-[0.72rem] text-faint">{label}</label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, icon: Icono, children }: { active: boolean; onClick: () => void; icon?: Icon; children: React.ReactNode }) {
  return (
    <ChoiceChip selected={active} onClick={onClick} icon={Icono && <Icono size={15} weight="bold" />}>
      {children}
    </ChoiceChip>
  );
}

function AccionChip({
  tipo,
  active,
  onClick,
  children,
}: {
  tipo: "todas" | AccionTipo;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const a = tipo === "todas" ? null : ACCION[tipo];
  const Icono = a?.icon;
  return (
    <ChoiceChip selected={active} onClick={onClick} icon={Icono && <Icono size={15} weight="bold" />}>
      {children}
    </ChoiceChip>
  );
}
