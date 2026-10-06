"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  CaretRight,
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
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Celdas, Celda } from "@/components/ui/celdas";
import { Contador } from "@/components/ui/contador";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { cn } from "@/lib/utils";
import { addDiasISO, formatCOP, formatFecha, formatHoraISO } from "@/lib/format";
import type { AuditEntry } from "@/lib/queries";

type AccionTipo = "INSERT" | "UPDATE" | "DELETE";

// El color va solo en el círculo de la línea de tiempo, en el par de su estado.
const ACCION: Record<string, { verbo: string; par: string; icon: Icon }> = {
  INSERT: { verbo: "registró", par: "bg-ok-bg text-ok-fg", icon: Plus },
  UPDATE: { verbo: "editó", par: "bg-info-bg text-info-fg", icon: PencilSimple },
  DELETE: { verbo: "borró", par: "bg-bad-bg text-bad-fg", icon: Trash },
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

// Valores que la base guarda con nombre de programa: se muestran como se dicen.
const VALOR: Record<string, string> = {
  consignacion_nequi: "Consignación a Nequi",
  consignacion_bancolombia: "Consignación a Bancolombia",
  retiro: "Retiro",
  recaudo: "Recaudo",
  compensacion: "Compensación",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  registro: "Solo registro",
  abierto: "Abierto",
  cerrado: "Cerrado",
};
const CAMPOS_CON_VALOR = new Set(["tipo", "medio", "estado", "origen"]);

function fmtVal(campo: string, v: unknown): string {
  if (v == null || v === "") return "vacío";
  if (MONEY.has(campo)) {
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : formatCOP(n);
  }
  if (campo === "fecha") return formatFecha(String(v));
  if (CAMPOS_CON_VALOR.has(campo)) return VALOR[String(v)] ?? String(v);
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
  const ayer = addDiasISO(hoy, -1);
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
      <Card>
        <Empty>
          <EmptyTitle>Aún no hay movimientos registrados</EmptyTitle>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen en celdas: las cifras en negro, el color va en la lista. */}
      <Card className="p-5">
        <Celdas>
          <Celda rotulo="Movimientos">{stats.total}</Celda>
          <Celda rotulo="Registros">{stats.INSERT}</Celda>
          <Celda rotulo="Ediciones">{stats.UPDATE}</Celda>
          <Celda rotulo="Borrados">{stats.DELETE}</Celda>
        </Celdas>
      </Card>

      <Card>
        {/* Barra de filtros dentro de la tarjeta de la lista. */}
        <div className="flex flex-col gap-3 px-5 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="h-9 min-w-[12rem] flex-1 rounded-full">
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
            <DatePicker id="bit-desde" variante="filtro" value={desde} onChange={setDesde} placeholder="Desde" aria-label="Desde" className="w-[8.75rem]" />
            <DatePicker id="bit-hasta" variante="filtro" value={hasta} onChange={setHasta} placeholder="Hasta" aria-label="Hasta" className="w-[8.75rem]" />
            <IconButton label="Descargar Excel" size="icon-sm" onClick={exportar} disabled={filtrados.length === 0}>
              <DownloadSimple size={18} weight="bold" />
            </IconButton>
          </div>

          <ToggleGroup
            type="single"
            variant="segmentado"
            value={accion}
            onValueChange={(v) => v && setAccion(v as "todas" | AccionTipo)}
            aria-label="Acción"
          >
            <ToggleGroupItem value="todas">Todas</ToggleGroupItem>
            <ToggleGroupItem value="INSERT">Registró</ToggleGroupItem>
            <ToggleGroupItem value="UPDATE">Editó</ToggleGroupItem>
            <ToggleGroupItem value="DELETE">Borró</ToggleGroupItem>
          </ToggleGroup>

          <div role="group" aria-label="Módulo" className="flex flex-wrap gap-2">
            <Chip active={modulo === "todos"} onClick={() => setModulo("todos")}>
              Todos
            </Chip>
            {MODULOS.map((m) => (
              <Chip key={m.id} active={modulo === m.id} onClick={() => setModulo(m.id)} icon={m.icon}>
                {m.label}
              </Chip>
            ))}
          </div>

          {(actores.length > 1 || hayFiltro) && (
            <div className="flex flex-wrap items-center gap-2">
              {actores.length > 1 && (
                <div role="group" aria-label="Quién" className="flex flex-wrap gap-2">
                  <Chip active={actor === "todos"} onClick={() => setActor("todos")}>
                    Todos
                  </Chip>
                  {actores.map((a) => (
                    <Chip key={a} active={actor === a} onClick={() => setActor(a)}>
                      {a.split(/\s+/)[0]}
                    </Chip>
                  ))}
                </div>
              )}
              {hayFiltro && (
                <Button size="sm" variant="ghost" onClick={limpiar} className="ml-auto">
                  <X size={16} />
                  Limpiar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Lista por día como línea de tiempo, del más nuevo al más viejo. */}
        {filtrados.length === 0 ? (
          <Empty fila className="px-5 pt-4 pb-5">
            <EmptyTitle>Ningún registro con estos filtros</EmptyTitle>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4 px-5 pt-5 pb-4">
            {grupos.map(([dia, items]) => (
              <section key={dia} aria-label={labelDia(dia)}>
                <div className="mb-1.5 flex items-center gap-2">
                  <h3 className="text-meta font-semibold text-faint">{labelDia(dia)}</h3>
                  <Contador n={items.length} />
                </div>
                <div role="list">
                  {items.map((e, i) => (
                    <Fila
                      key={e.id}
                      e={e}
                      primera={i === 0}
                      ultima={i === items.length - 1}
                      abierto={abiertos.has(e.id)}
                      onToggle={() => toggle(e.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Un evento de la línea de tiempo (guía 8.27): hora a la izquierda, círculo de
 * 32 en el par de la acción unido a los demás por una línea, y la frase. Al
 * tocarla se abre el detalle con los cambios.
 */
function Fila({
  e,
  primera,
  ultima,
  abierto,
  onToggle,
}: {
  e: AuditEntry;
  primera: boolean;
  ultima: boolean;
  abierto: boolean;
  onToggle: () => void;
}) {
  const acc = ACCION[e.accion] ?? { verbo: e.accion, par: "bg-surface-2 text-muted", icon: PencilSimple };
  const tabla = TABLA_TEXTO[e.tabla] ?? e.tabla;
  const monto = montoDe(e);
  const Icono = acc.icon;
  const cambios = cambiosDe(e);
  const detalle = [e.fecha_dato ? `del ${formatFecha(e.fecha_dato)}` : null, monto != null ? formatCOP(monto) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <Collapsible asChild open={abierto} onOpenChange={onToggle}>
      <div role="listitem" className="relative grid grid-cols-[52px_32px_minmax(0,1fr)] gap-x-3">
        {/* La línea que une los círculos: de un centro al siguiente. */}
        {!(primera && ultima) && (
          <span
            aria-hidden
            className={cn(
              "absolute left-[79px] w-0.5 bg-line",
              primera ? "top-5" : "top-0",
              ultima ? "h-5" : "bottom-0",
            )}
          />
        )}
        <span className="tnum pt-[11px] text-meta text-faint">{formatHoraISO(e.created_at)}</span>
        <span className={cn("relative z-[1] mt-1 grid size-8 place-items-center rounded-full", acc.par)}>
          <Icono size={15} weight="bold" />
        </span>
        <CollapsibleTrigger className="group/evento flex min-w-0 items-start gap-2 rounded-lg py-1.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid">
          <span className="min-w-0 flex-1">
            <span className="block text-body text-text">
              <span className="font-semibold">{e.actorNombre}</span> {acc.verbo} {tabla}
            </span>
            {detalle && <span className="tnum block text-meta text-muted">{detalle}</span>}
          </span>
          <CaretRight
            aria-hidden
            weight="bold"
            className="mt-1 size-3.5 shrink-0 text-inerte transition-transform duration-[var(--dur-2)] ease-ios group-data-[state=open]/evento:rotate-90"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="plegable-cuerpo col-start-3 overflow-hidden">
          <div className="pb-2">
            {cambios.length === 0 ? (
              <p className="text-meta text-faint">Sin detalle adicional</p>
            ) : (
              <div className="flex flex-col">
                {cambios.map((c) => (
                  <div
                    key={c.campo}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-linea-fila py-1.5 text-meta last:border-b-0"
                  >
                    <span className="shrink-0 text-muted">{CAMPO[c.campo] ?? c.campo}</span>
                    {c.valor != null ? (
                      <span className="tnum min-w-0 break-words text-right font-medium text-text">{c.valor}</span>
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
      </div>
    </Collapsible>
  );
}

function Chip({ active, onClick, icon: Icono, children }: { active: boolean; onClick: () => void; icon?: Icon; children: React.ReactNode }) {
  return (
    <ChoiceChip selected={active} onClick={onClick} icon={Icono && <Icono size={15} weight="bold" />}>
      {children}
    </ChoiceChip>
  );
}
