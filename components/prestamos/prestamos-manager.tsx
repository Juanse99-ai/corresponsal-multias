"use client";

import { Fragment, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  HandCoins,
  CaretDown,
  CheckCircle,
  ArrowCounterClockwise,
  Tag,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatFecha, hoyISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo, PersonaGrupo } from "@/lib/queries";
import type { AbonoRow } from "@/lib/database.types";
import { claveNombre, origenesUsados, resumenOrigenes } from "@/lib/prestamos";
import {
  crearDeuda,
  agregarAbono,
  eliminarDeuda,
  reabrirPrestamo,
  etiquetarAbono,
} from "@/app/(app)/prestamos/actions";

const CONCEPTOS = ["Préstamo personal", "Adelanto", "Gasto", "Otro"];

/** Iniciales para el círculo de la persona ("Juan Sebastián" -> "JS"). */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function PrestamosManager({
  grupos,
  isAdmin,
}: {
  grupos: PersonaGrupo[];
  isAdmin: boolean;
}) {
  const deben = grupos.filter((g) => g.saldo > 0);
  const alDia = grupos.filter((g) => g.saldo <= 0);
  const totalPendiente = deben.reduce((s, g) => s + g.saldo, 0);
  // Los orígenes que ya se usaron en cualquier préstamo, para no reescribirlos.
  const origenes = useMemo(
    () => origenesUsados(grupos.flatMap((g) => g.deudas.flatMap((d) => d.abonos))),
    [grupos],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Quién debe</h3>
          {deben.length > 0 && (
            <p className="tnum text-[0.78rem] text-faint">
              {deben.length} persona{deben.length === 1 ? "" : "s"} · {formatCOP(totalPendiente)}
            </p>
          )}
        </div>

        {deben.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
              <HandCoins size={20} />
            </div>
            <p className="text-sm text-muted">Nadie tiene préstamos pendientes.</p>
            <p className="text-[0.78rem] text-faint">Registra uno en el panel de la derecha.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {deben.map((g, i) => (
                <PersonaCard
                  key={g.key}
                  grupo={g}
                  isAdmin={isAdmin}
                  origenes={origenes}
                  defaultOpen={i === 0 && deben.length <= 3}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {alDia.length > 0 && (
          <details className="group mt-5">
            <summary className="flex cursor-pointer items-center gap-2 px-1 text-[0.82rem] text-faint hover:text-muted">
              <CaretDown size={14} className="transition-transform group-open:rotate-180" />
              {alDia.length} persona{alDia.length === 1 ? "" : "s"} al día
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {alDia.map((g) => (
                <PersonaCard key={g.key} grupo={g} isAdmin={isAdmin} origenes={origenes} defaultOpen={false} />
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-8">
        {isAdmin && (
          <Card className="relative overflow-hidden border-accent/30 p-6">
            <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Total pendiente</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-text">
              <AnimatedMoney value={totalPendiente} />
            </p>
          </Card>
        )}
        <AddDeudaForm />
      </div>
    </div>
  );
}

function AddDeudaForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [persona, setPersona] = useState("Juan Sebastián");
  const [otro, setOtro] = useState("");
  const [concepto, setConcepto] = useState("Préstamo personal");
  const [conceptoOtro, setConceptoOtro] = useState("");
  const [monto, setMonto] = useState(0);
  // Sin premarcar: el medio decide si la plata sale del arqueo o de la tirilla,
  // y ningún valor domina lo suficiente para arriesgar un registro por inercia.
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "registro" | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const personaFinal = persona === "Otro" ? otro.trim() : persona;
  const conceptoFinal = concepto === "Otro" ? conceptoOtro.trim() : concepto;

  function registrar() {
    if (!personaFinal) return setMsg({ ok: false, text: "Indica la persona." });
    if (monto <= 0) return setMsg({ ok: false, text: "Ingresa un monto." });
    if (concepto === "Otro" && !conceptoOtro.trim()) return setMsg({ ok: false, text: "Especifica el concepto." });
    if (!descripcion.trim()) return setMsg({ ok: false, text: "Escribe el motivo (para qué fue el préstamo)." });
    if (!medio) return setMsg({ ok: false, text: "Indica cómo se lo diste: efectivo, transferencia o solo registro." });
    setMsg(null);
    startTransition(async () => {
      const res = await crearDeuda({
        persona: personaFinal,
        monto,
        concepto: conceptoFinal || null,
        descripcion: descripcion.trim(),
        medio,
        fecha,
      });
      if (res.ok) {
        setMonto(0);
        setDescripcion("");
        setOtro("");
        setConceptoOtro("");
        setMedio(null);
        setMsg({ ok: true, text: "Préstamo registrado." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Error." });
      }
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Nuevo préstamo</h3>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label id="grp-persona">Persona</Label>
          <div role="group" aria-labelledby="grp-persona" className="flex flex-wrap gap-2">
            {[...PERSONAS_PRESET, "Otro"].map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={persona === p}
                onClick={() => setPersona(p)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
                  persona === p
                    ? "lg-glass-accent text-glass-ink-accent"
                    : "border-line-strong text-muted hover:text-text",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          {persona === "Otro" && (
            <Input
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="Nombre de la persona"
              className="mt-1"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label id="grp-concepto">Concepto</Label>
          <div role="group" aria-labelledby="grp-concepto" className="flex flex-wrap gap-2">
            {CONCEPTOS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={concepto === c}
                onClick={() => setConcepto(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
                  concepto === c
                    ? "lg-glass-accent text-glass-ink-accent"
                    : "border-line-strong text-muted hover:text-text",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {concepto === "Otro" && (
            <Input
              value={conceptoOtro}
              onChange={(e) => setConceptoOtro(e.target.value)}
              placeholder="Especifica el concepto"
              className="mt-1"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="deuda-monto">Monto</Label>
          <MoneyInput id="deuda-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
        </div>

        <div className="flex flex-col gap-2">
          <Label id="grp-medio">¿Cómo se lo diste?</Label>
          <div className="flex gap-2">
            {(["transferencia", "efectivo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMedio(m)}
                className={cn(
                  "flex-1 rounded-card border px-3 py-2 text-[0.8rem] font-medium transition-colors",
                  medio === m
                    ? "lg-glass-accent text-glass-ink-accent"
                    : "border-line-strong text-muted hover:text-text",
                )}
              >
                {m === "efectivo" ? "Efectivo" : "Transferencia"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMedio("registro")}
            className={cn(
              "rounded-card border px-3 py-2 text-[0.8rem] font-medium transition-colors",
              medio === "registro"
                ? "lg-glass-accent text-glass-ink-accent"
                : "border-line-strong text-muted hover:text-text",
            )}
          >
            Solo registro · no afecta el cuadre
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="deuda-desc">Motivo · ¿para qué fue?</Label>
            <Input id="deuda-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Para qué fue el préstamo" onEnter={() => !pending && registrar()} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deuda-fecha">Fecha</Label>
            <Input id="deuda-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full sm:w-[9.5rem]" />
          </div>
        </div>

        {msg?.ok ? (
          <div className="flex items-center gap-2 rounded-card border border-success/30 bg-success-soft px-3.5 py-2.5 text-[0.82rem] text-success">
            <CheckCircle size={15} weight="fill" />
            {msg.text}
          </div>
        ) : (
          <ErrorNotice message={msg?.text ?? null} />
        )}

        <Button onClick={registrar} disabled={pending}>
          <Plus size={18} weight="bold" />
          {pending ? "Registrando…" : "Registrar préstamo"}
        </Button>
      </div>
    </Card>
  );
}

/** Una persona = una tarjeta. El encabezado resume su deuda; al abrir salen sus préstamos. */
function PersonaCard({
  grupo,
  isAdmin,
  origenes,
  defaultOpen,
}: {
  grupo: PersonaGrupo;
  isAdmin: boolean;
  origenes: string[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const alDia = grupo.saldo <= 0;
  const pct = grupo.total > 0 ? Math.min(100, (grupo.abonado / grupo.total) * 100) : 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 sm:p-5"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.78rem] font-semibold",
              alDia ? "bg-success-soft text-success" : "bg-accent-soft text-accent-strong",
            )}
          >
            {iniciales(grupo.persona)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-text">{grupo.persona}</span>
              {alDia && <Badge tone="success">Al día</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-[0.72rem] text-faint">
              {alDia ? (
                <>
                  {grupo.deudas.length} préstamo{grupo.deudas.length === 1 ? "" : "s"}
                  <span className="hidden sm:inline"> · todo pagado</span>
                </>
              ) : (
                <>
                  {grupo.activos} pendiente{grupo.activos === 1 ? "" : "s"}
                  {/* El detalle del abono solo si cabe: en celular estorbaba y se cortaba. */}
                  <span className="hidden sm:inline">
                    {" "}
                    · abonado {formatCOP(grupo.abonado)} de {formatCOP(grupo.total)}
                  </span>
                </>
              )}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className={cn("tnum block text-lg font-semibold", alDia ? "text-success" : "text-text")}>
              {formatCOP(alDia ? 0 : grupo.saldo)}
            </span>
          </span>

          <CaretDown
            size={16}
            className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")}
          />
        </button>

        {/* Sin abonos la barra es un riel gris decorativo: no se dibuja. */}
        {(grupo.abonado > 0 || alDia) && (
        <div className="mx-4 mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:mx-5 sm:mb-5">
          <motion.div
            className={cn("h-full rounded-full", alDia ? "bg-success" : "bg-accent")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ul className="flex flex-col divide-y divide-line border-t border-line">
                {grupo.deudas.map((d) => (
                  <DeudaRow key={d.id} deuda={d} isAdmin={isAdmin} origenes={origenes} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/**
 * De dónde sale la plata. Las fichas son los orígenes ya usados; tocar una llena
 * el campo y volver a tocarla lo vacía. El texto es la única fuente de verdad.
 */
function OrigenPicker({
  id,
  value,
  onChange,
  sugeridos,
  onEnter,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  sugeridos: string[];
  onEnter?: () => void;
}) {
  const clave = claveNombre(value);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>¿De dónde sale la plata?</Label>
      {sugeridos.length > 0 && (
        <div role="group" aria-label="Orígenes usados antes" className="flex flex-wrap gap-1.5">
          {sugeridos.slice(0, 8).map((o) => {
            const activo = clave !== "" && claveNombre(o) === clave;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={activo}
                onClick={() => onChange(activo ? "" : o)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
                  activo ? "lg-glass-accent text-glass-ink-accent" : "border-line-strong text-muted hover:text-text",
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
      <Input
        id={id}
        value={value}
        maxLength={40}
        onChange={(e) => onChange(e.target.value)}
        placeholder={sugeridos.length > 0 ? "U otro origen" : "Ej: taller, perfumes, sueldo"}
        onEnter={onEnter}
      />
    </div>
  );
}

/** Un abono del historial. Tocar la etiqueta abre el editor del origen. */
function AbonoItem({ abono, origenes }: { abono: AbonoRow; origenes: string[] }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(abono.origen ?? "");
  const [err, setErr] = useState<string | null>(null);

  function guardar(nuevo: string) {
    setErr(null);
    startTransition(async () => {
      const res = await etiquetarAbono({ id: abono.id, origen: nuevo });
      if (!res.ok) {
        setErr(res.error ?? "No se pudo guardar el origen.");
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2 text-[0.8rem]">
        <span className="shrink-0 text-faint">{formatFecha(abono.fecha)}</span>
        <button
          type="button"
          aria-expanded={editando}
          onClick={() => {
            setValor(abono.origen ?? "");
            setErr(null);
            setEditando((v) => !v);
          }}
          className={cn(
            "flex min-w-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium transition-colors",
            abono.origen
              ? "border-line-strong bg-surface-2 text-muted hover:text-text"
              : "border-dashed border-line-strong text-faint hover:text-muted",
          )}
        >
          <Tag size={12} className="shrink-0" />
          <span className="truncate">{abono.origen ?? "Poner origen"}</span>
        </button>
        <span className="tnum ml-auto shrink-0 text-success">+{formatCOP(abono.monto)}</span>
      </div>

      <AnimatePresence initial={false}>
        {editando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-3 rounded-card border border-line bg-surface-2/60 p-3">
              <OrigenPicker
                id={id}
                value={valor}
                onChange={setValor}
                sugeridos={origenes}
                onEnter={() => !pending && guardar(valor)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => guardar(valor)} disabled={pending}>
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
                {abono.origen && (
                  <Button size="sm" variant="secondary" onClick={() => guardar("")} disabled={pending}>
                    Quitar origen
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="ml-auto px-1 text-[0.76rem] text-faint hover:text-muted"
                >
                  Cancelar
                </button>
              </div>
              <ErrorNotice message={err} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function DeudaRow({
  deuda,
  isAdmin,
  origenes,
}: {
  deuda: DeudaConSaldo;
  isAdmin: boolean;
  origenes: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [abono, setAbono] = useState(0);
  const [origen, setOrigen] = useState("");
  const [err, setErr] = useState<string | null>(null);
  // Confirmación propia para las dos acciones destructivas de la fila.
  const [confirmando, setConfirmando] = useState<null | "borrar" | "reabrir">(null);

  const pct = deuda.monto > 0 ? Math.min(100, (deuda.abonado / deuda.monto) * 100) : 0;
  const saldada = deuda.saldo <= 0;
  const porOrigen = resumenOrigenes(deuda.abonos);
  const hayOrigen = porOrigen.some((o) => o.origen !== null);

  function abonar() {
    if (abono <= 0) return;
    setErr(null);
    startTransition(async () => {
      const res = await agregarAbono({
        deuda_id: deuda.id,
        monto: Math.min(abono, deuda.saldo),
        nota: null,
        origen: origen || null,
      });
      if (res && !res.ok) {
        setErr(res.error ?? "No se pudo registrar el abono.");
        return;
      }
      setAbono(0);
      setOrigen("");
      setAbonoOpen(false);
      router.refresh();
    });
  }

  function borrar() {
    setConfirmando(null);
    setErr(null);
    startTransition(async () => {
      const res = await eliminarDeuda(deuda.id);
      if (res && !res.ok) {
        setErr(res.error ?? "No se pudo borrar el préstamo.");
        return;
      }
      router.refresh();
    });
  }

  function reabrir() {
    setConfirmando(null);
    setErr(null);
    startTransition(async () => {
      const res = await reabrirPrestamo(deuda.id);
      if (res && !res.ok) {
        setErr(res.error ?? "No se pudo deshacer el pago.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="p-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {deuda.concepto && <Badge tone="neutral">{deuda.concepto}</Badge>}
              {saldada && <Badge tone="success">Pagado</Badge>}
              <span className="text-[0.72rem] text-faint">{formatFecha(deuda.fecha)}</span>
            </div>
            <p className="mt-1 truncate text-[0.82rem] text-muted">
              {deuda.descripcion || "Sin motivo anotado"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("tnum text-[0.95rem] font-semibold", saldada ? "text-success" : "text-text")}>
              {saldada ? formatCOP(0) : formatCOP(deuda.saldo)}
            </p>
            {deuda.abonado > 0 && (
              <p className="text-[0.68rem] text-faint">de {formatCOP(deuda.monto)}</p>
            )}
          </div>
        </div>

        {deuda.abonado > 0 && !saldada && (
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Solo cuando hay al menos un origen: si todo está sin etiqueta no dice nada nuevo. */}
        {hayOrigen && (
          <p className="mt-2 text-[0.72rem] leading-relaxed text-faint">
            Pagado con{" "}
            {porOrigen.map((o, i) => (
              // El separador va por fuera: así la línea puede partir entre orígenes.
              <Fragment key={o.origen ?? "sin-origen"}>
                {i > 0 && " · "}
                <span className="tnum whitespace-nowrap">
                  <span className={o.origen ? "font-medium text-muted" : undefined}>
                    {o.origen ?? "sin origen"}
                  </span>{" "}
                  {formatCOP(o.monto)}
                </span>
              </Fragment>
            ))}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {saldada ? (
            <Button size="sm" variant="secondary" onClick={() => setConfirmando("reabrir")} disabled={pending}>
              <ArrowCounterClockwise size={15} weight="bold" />
              Reabrir
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setAbonoOpen((v) => !v)} disabled={pending}>
              Abonar
            </Button>
          )}
          {deuda.abonos.length > 0 && (
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center gap-1 px-1 text-[0.76rem] text-faint hover:text-muted"
            >
              <CaretDown size={13} className={cn("transition-transform", historyOpen && "rotate-180")} />
              {deuda.abonos.length} abono{deuda.abonos.length === 1 ? "" : "s"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setConfirmando("borrar")}
              disabled={pending}
              title="Eliminar préstamo" aria-label="Eliminar préstamo"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
            >
              <Trash size={15} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {abonoOpen && !saldada && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`ab-${deuda.id}`}>Abono</Label>
                  <MoneyInput id={`ab-${deuda.id}`} value={abono} onValueChange={setAbono} onEnter={() => !pending && abonar()} />
                </div>
                <OrigenPicker
                  id={`or-${deuda.id}`}
                  value={origen}
                  onChange={setOrigen}
                  sugeridos={origenes}
                  onEnter={() => !pending && abonar()}
                />
                <Button size="md" onClick={abonar} disabled={pending} className="w-full sm:w-auto sm:self-end">
                  {pending ? "Registrando…" : "Confirmar abono"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ErrorNotice message={err} className="mt-3" />

        <AnimatePresence>
          {historyOpen && deuda.abonos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line pt-1">
                {deuda.abonos.map((a) => (
                  <AbonoItem key={a.id} abono={a} origenes={origenes} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

      <ConfirmDialog
        open={confirmando !== null}
        titulo={confirmando === "reabrir" ? "¿Deshacer el último pago?" : "¿Borrar este préstamo?"}
        monto={confirmando === "borrar" ? deuda.monto : null}
        detalle={
          confirmando === "reabrir"
            ? "El préstamo vuelve a quedar pendiente."
            : `De ${deuda.persona}. Se elimina junto con todos sus abonos y no se puede deshacer.`
        }
        confirmar={confirmando === "reabrir" ? "Sí, deshacer" : "Sí, borrar"}
        onConfirmar={confirmando === "reabrir" ? reabrir : borrar}
        onCancelar={() => setConfirmando(null)}
      />
    </li>
  );
}
