"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  HandCoins,
  CaretDown,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha, hoyISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo, PersonaSaldo } from "@/lib/queries";
import { crearDeuda, agregarAbono, eliminarDeuda } from "@/app/(app)/prestamos/actions";

const CONCEPTOS = ["Préstamo personal", "Adelanto", "Gasto", "Otro"];

export function PrestamosManager({
  deudas,
  personas,
  isAdmin,
}: {
  deudas: DeudaConSaldo[];
  personas: PersonaSaldo[];
  isAdmin: boolean;
}) {
  const totalPendiente = personas.reduce((s, p) => s + p.saldo, 0);
  const pendientes = deudas.filter((d) => d.saldo > 0);
  const saldadas = deudas.filter((d) => d.saldo <= 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="flex flex-col gap-5">
        {personas.length > 0 && (
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 text-[0.95rem] font-semibold tracking-tight text-text">Saldo por persona</h3>
            <div className="flex flex-col gap-4">
              {personas.map((p) => {
                const pct = p.total > 0 ? Math.min(100, (p.abonado / p.total) * 100) : 0;
                return (
                  <div key={p.persona}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-text">{p.persona}</span>
                      <span className={cn("tnum font-semibold", p.saldo > 0 ? "text-text" : "text-success")}>
                        {p.saldo > 0 ? formatCOP(p.saldo) : "Al día"}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 22 }}
                      />
                    </div>
                    <p className="mt-1 text-[0.7rem] text-faint">
                      Abonado {formatCOP(p.abonado)} de {formatCOP(p.total)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div>
          <h3 className="mb-3 px-1 text-[0.95rem] font-semibold tracking-tight text-text">
            Préstamos activos
          </h3>
          {pendientes.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-14 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
                <HandCoins size={20} />
              </div>
              <p className="text-sm text-muted">No hay préstamos pendientes.</p>
              <p className="text-[0.78rem] text-faint">Registra uno en el panel de la derecha.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {pendientes.map((d) => (
                  <DeudaCard key={d.id} deuda={d} isAdmin={isAdmin} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {saldadas.length > 0 && (
            <details className="mt-5 group">
              <summary className="flex cursor-pointer items-center gap-2 px-1 text-[0.82rem] text-faint hover:text-muted">
                <CaretDown size={14} className="transition-transform group-open:rotate-180" />
                {saldadas.length} préstamo{saldadas.length === 1 ? "" : "s"} al día
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {saldadas.map((d) => (
                  <DeudaCard key={d.id} deuda={d} isAdmin={isAdmin} />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        {isAdmin && (
          <Card className="relative overflow-hidden border-accent/30 p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
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
  const [medio, setMedio] = useState<"efectivo" | "transferencia">("transferencia");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const personaFinal = persona === "Otro" ? otro.trim() : persona;
  const conceptoFinal = concepto === "Otro" ? conceptoOtro.trim() : concepto;

  function registrar() {
    if (!personaFinal) return setMsg({ ok: false, text: "Indica la persona." });
    if (monto <= 0) return setMsg({ ok: false, text: "Ingresa un monto." });
    setMsg(null);
    startTransition(async () => {
      const res = await crearDeuda({
        persona: personaFinal,
        monto,
        concepto: conceptoFinal || null,
        descripcion: descripcion || null,
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
      <p className="text-sm text-muted">Quién tomó, cuánto y cuándo.</p>

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
                    ? "border-accent/40 bg-accent-soft text-accent-strong"
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
                    ? "border-accent/40 bg-accent-soft text-accent-strong"
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
          <MoneyInput id="deuda-monto" value={monto} onValueChange={setMonto} />
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
                  "flex-1 rounded-[--radius-card] border px-3 py-2 text-[0.8rem] font-medium transition-colors",
                  medio === m
                    ? "border-accent/40 bg-accent-soft text-accent-strong"
                    : "border-line-strong text-muted hover:text-text",
                )}
              >
                {m === "efectivo" ? "Efectivo" : "Transferencia"}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-faint">Transferencia entra al cuadre; efectivo va al arqueo.</p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="deuda-desc">Descripción</Label>
            <Input id="deuda-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Motivo" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deuda-fecha">Fecha</Label>
            <Input id="deuda-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-[9.5rem]" />
          </div>
        </div>

        {msg && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-[--radius-card] px-3.5 py-2.5 text-[0.82rem]",
              msg.ok ? "border border-success/30 bg-success-soft text-success" : "border border-danger/30 bg-danger-soft text-danger",
            )}
          >
            {msg.ok ? <CheckCircle size={15} weight="fill" /> : <Warning size={15} weight="fill" />}
            {msg.text}
          </div>
        )}

        <Button onClick={registrar} disabled={pending}>
          <Plus size={18} weight="bold" />
          {pending ? "Registrando…" : "Registrar préstamo"}
        </Button>
      </div>
    </Card>
  );
}

function DeudaCard({ deuda, isAdmin }: { deuda: DeudaConSaldo; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [abono, setAbono] = useState(0);

  const pct = deuda.monto > 0 ? Math.min(100, (deuda.abonado / deuda.monto) * 100) : 0;
  const saldada = deuda.saldo <= 0;

  function abonar() {
    if (abono <= 0) return;
    startTransition(async () => {
      await agregarAbono({ deuda_id: deuda.id, monto: Math.min(abono, deuda.saldo), nota: null });
      setAbono(0);
      setAbonoOpen(false);
      router.refresh();
    });
  }

  function borrar() {
    startTransition(async () => {
      await eliminarDeuda(deuda.id);
      router.refresh();
    });
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-text">{deuda.persona}</p>
              {deuda.concepto && <Badge tone="neutral">{deuda.concepto}</Badge>}
              {saldada && <Badge tone="success">Al día</Badge>}
            </div>
            <p className="mt-0.5 truncate text-[0.78rem] text-faint">
              {deuda.descripcion || "Sin descripción"} · {formatFecha(deuda.fecha)}
            </p>
          </div>
          <div className="text-right">
            <p className={cn("tnum text-lg font-semibold", saldada ? "text-success" : "text-text")}>
              {saldada ? formatCOP(0) : formatCOP(deuda.saldo)}
            </p>
            <p className="text-[0.68rem] text-faint">de {formatCOP(deuda.monto)}</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {!saldada && (
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
              title="Eliminar préstamo"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
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
                    <MoneyInput id={`ab-${deuda.id}`} value={abono} onValueChange={setAbono} />
                  </div>
                </div>
                <Button size="md" onClick={abonar} disabled={pending}>
                  {pending ? "…" : "Confirmar"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
      </Card>
    </motion.div>
  );
}
