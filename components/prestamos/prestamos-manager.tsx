"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  HandCoins,
  CaretDown,
  CheckCircle,
  ArrowCounterClockwise,
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
import { formatCOP, formatFecha, hoyISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo, PersonaGrupo } from "@/lib/queries";
import { crearDeuda, agregarAbono, eliminarDeuda, reabrirPrestamo } from "@/app/(app)/prestamos/actions";

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
                <PersonaCard key={g.key} grupo={g} isAdmin={isAdmin} defaultOpen={false} />
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
            <p className="mt-1 text-[0.78rem] text-faint">Suma de saldos vivos del fondo</p>
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
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "registro">("transferencia");
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
          <Label>Persona</Label>
          <div className="flex flex-wrap gap-2">
            {[...PERSONAS_PRESET, "Otro"].map((p) => (
              <button
                key={p}
                type="button"
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
          <Label>Concepto</Label>
          <div className="flex flex-wrap gap-2">
            {CONCEPTOS.map((c) => (
              <button
                key={c}
                type="button"
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
          <Label>¿Cómo se lo diste?</Label>
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
          <p className="text-[0.7rem] text-faint">
            {medio === "registro"
              ? "Queda como préstamo por cobrar, pero no entra ni a la tirilla ni a la caja."
              : "Transferencia entra al cuadre; efectivo va al arqueo."}
          </p>
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
  defaultOpen,
}: {
  grupo: PersonaGrupo;
  isAdmin: boolean;
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
              {alDia ? "$0" : formatCOP(grupo.saldo)}
            </span>
          </span>

          <CaretDown
            size={16}
            className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")}
          />
        </button>

        <div className="mx-4 mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:mx-5 sm:mb-5">
          <motion.div
            className={cn("h-full rounded-full", alDia ? "bg-success" : "bg-accent")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>

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
                  <DeudaRow key={d.id} deuda={d} isAdmin={isAdmin} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function DeudaRow({ deuda, isAdmin }: { deuda: DeudaConSaldo; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [abono, setAbono] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const pct = deuda.monto > 0 ? Math.min(100, (deuda.abonado / deuda.monto) * 100) : 0;
  const saldada = deuda.saldo <= 0;

  function abonar() {
    if (abono <= 0) return;
    setErr(null);
    startTransition(async () => {
      const res = await agregarAbono({ deuda_id: deuda.id, monto: Math.min(abono, deuda.saldo), nota: null });
      if (res && !res.ok) {
        setErr(res.error ?? "No se pudo registrar el abono.");
        return;
      }
      setAbono(0);
      setAbonoOpen(false);
      router.refresh();
    });
  }

  function borrar() {
    if (
      !window.confirm(
        `¿Borrar el préstamo de ${deuda.persona} por ${formatCOP(deuda.monto)}? Se elimina junto con todos sus abonos. No se puede deshacer.`,
      )
    )
      return;
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
    if (!window.confirm("¿Deshacer el último pago? El préstamo vuelve a quedar pendiente.")) return;
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
            <p className="text-[0.68rem] text-faint">de {formatCOP(deuda.monto)}</p>
          </div>
        </div>

        {deuda.abonado > 0 && !saldada && (
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {saldada ? (
            <Button size="sm" variant="secondary" onClick={reabrir} disabled={pending}>
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
              onClick={borrar}
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
              <div className="mt-3 flex items-end gap-2 border-t border-line pt-3">
                <div className="flex-1">
                  <Label htmlFor={`ab-${deuda.id}`}>Abono</Label>
                  <div className="mt-1.5">
                    <MoneyInput id={`ab-${deuda.id}`} value={abono} onValueChange={setAbono} onEnter={() => !pending && abonar()} />
                  </div>
                </div>
                <Button size="md" onClick={abonar} disabled={pending}>
                  {pending ? "…" : "Confirmar"}
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
                  <li key={a.id} className="flex items-center justify-between py-2 text-[0.8rem]">
                    <span className="text-faint">{formatFecha(a.fecha)}</span>
                    <span className="tnum text-success">+{formatCOP(a.monto)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
    </li>
  );
}
