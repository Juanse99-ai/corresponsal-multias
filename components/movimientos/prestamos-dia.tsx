"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HandCoins, Plus, Trash, PencilSimple, Check, Clock, Warning, CheckCircle, Lock, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP, formatHoraISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo } from "@/lib/queries";
import { registrarPrestamoDia, marcarPrestamoPagado, reabrirPrestamo, eliminarDeuda, editarDeuda } from "@/app/(app)/prestamos/actions";
import { reduced } from "@/components/fx/reduced";

export function PrestamosDia({
  fecha,
  prestamos,
  isAdmin,
  bloqueado,
}: {
  fecha: string;
  prestamos: DeudaConSaldo[];
  isAdmin: boolean;
  bloqueado?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [persona, setPersona] = useState("");
  const [otro, setOtro] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState(0);
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "registro">("efectivo");
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición inline de un préstamo.
  const [editId, setEditId] = useState<string | null>(null);
  const [ePersona, setEPersona] = useState("");
  const [eOtro, setEOtro] = useState("");
  const [eConcepto, setEConcepto] = useState("");
  const [eMonto, setEMonto] = useState(0);

  // Préstamos recién registrados (no presentes al cargar) hacen flash verde.
  const idsIniciales = useRef<Set<string> | null>(null);
  const yaEstaban = (idsIniciales.current ??= new Set(prestamos.map((d) => d.id)));

  const { pendiente, prestado, devuelto } = useMemo(() => {
    let pendiente = 0;
    let prestado = 0;
    let devuelto = 0;
    for (const p of prestamos) {
      pendiente += p.saldo;
      prestado += p.monto;
      devuelto += p.abonado;
    }
    return { pendiente, prestado, devuelto };
  }, [prestamos]);

  function registrar() {
    if (bloqueado) return;
    const personaFinal = persona === "Otro" ? otro.trim() : persona;
    if (!personaFinal) return setError("Elige a quién es el préstamo.");
    if (monto <= 0) return setError("Ingresa un monto mayor a cero.");
    if (!concepto.trim()) return setError("Escribe para qué fue el préstamo (motivo).");
    setError(null);
    startTransition(async () => {
      const res = await registrarPrestamoDia({
        fecha,
        persona: personaFinal,
        concepto: concepto.trim(),
        monto,
        medio,
        pagado,
      });
      if (res.ok) {
        setPersona("");
        setOtro("");
        setConcepto("");
        setMonto(0);
        setMedio("efectivo");
        setPagado(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function pagar(d: DeudaConSaldo) {
    startTransition(async () => {
      await marcarPrestamoPagado({ deuda_id: d.id, monto: d.saldo });
      router.refresh();
    });
  }

  function reabrir(d: DeudaConSaldo) {
    if (!window.confirm("¿Deshacer el pago? El préstamo vuelve a quedar pendiente.")) return;
    startTransition(async () => {
      const res = await reabrirPrestamo(d.id);
      if (res && !res.ok) setError(res.error ?? "No se pudo deshacer.");
      router.refresh();
    });
  }

  function borrar(id: string) {
    if (!window.confirm("¿Borrar este préstamo? Queda registrado en la Bitácora.")) return;
    startTransition(async () => {
      await eliminarDeuda(id);
      router.refresh();
    });
  }

  function cambiarMedio(d: DeudaConSaldo) {
    const next =
      d.medio === "efectivo" ? "transferencia" : d.medio === "transferencia" ? "registro" : "efectivo";
    startTransition(async () => {
      await editarDeuda({ id: d.id, medio: next });
      router.refresh();
    });
  }

  function abrirEdicion(d: DeudaConSaldo) {
    setEditId(d.id);
    const preset = (PERSONAS_PRESET as readonly string[]).includes(d.persona);
    setEPersona(preset ? d.persona : "Otro");
    setEOtro(preset ? "" : d.persona);
    setEConcepto(d.concepto ?? "");
    setEMonto(d.monto);
    setError(null);
  }

  function guardarEdicion() {
    if (!editId) return;
    const personaFinal = ePersona === "Otro" ? eOtro.trim() : ePersona;
    if (!personaFinal) return setError("Elige a quién es el préstamo.");
    if (eMonto <= 0) return setError("Ingresa un monto mayor a cero.");
    if (!eConcepto.trim()) return setError("Escribe para qué fue el préstamo (motivo).");
    setError(null);
    startTransition(async () => {
      const res = await editarDeuda({
        id: editId,
        persona: personaFinal,
        concepto: eConcepto.trim(),
        monto: eMonto,
      });
      if (res.ok) {
        setEditId(null);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo editar.");
      }
    });
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <HandCoins size={15} weight="bold" />
            </span>
            <h2 className="text-[0.95rem] font-semibold tracking-tight text-text">Préstamos del día</h2>
          </div>

          {bloqueado && (
            <div className="mt-4 flex items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3.5 py-2.5 text-[0.82rem] text-muted">
              <Lock size={15} weight="fill" className="text-accent" />
              Día cerrado. Solo Juan puede reabrirlo.
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>A quién</Label>
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
                  onEnter={() => !pending && !bloqueado && registrar()}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-concepto">Motivo · ¿para qué fue?</Label>
              <Input
                id="pr-concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Préstamo personal, adelanto…"
                onEnter={() => !pending && !bloqueado && registrar()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-monto">Monto</Label>
              <MoneyInput id="pr-monto" value={monto} onValueChange={setMonto} onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>¿Ya lo devolvió?</Label>
              <button
                type="button"
                onClick={() => setPagado((v) => !v)}
                className={cn(
                  "flex h-[2.75rem] items-center gap-2.5 rounded-card border px-3.5 text-[0.85rem] transition-colors",
                  pagado
                    ? "border-success/40 bg-success-soft text-success"
                    : "border-line-strong text-muted hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                    pagado ? "border-success bg-success text-white" : "border-line-strong",
                  )}
                >
                  {pagado && <Check size={11} weight="bold" />}
                </span>
                {pagado ? "Sí, devuelto hoy" : "Sigue pendiente"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Label>¿Cómo se lo diste?</Label>
            <div className="flex gap-2">
              {(["efectivo", "transferencia"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedio(m)}
                  className={cn(
                    "flex-1 rounded-card border px-3 py-2.5 text-[0.82rem] font-medium transition-colors",
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
                "rounded-card border px-3 py-2.5 text-[0.82rem] font-medium transition-colors",
                medio === "registro"
                  ? "lg-glass-accent text-glass-ink-accent"
                  : "border-line-strong text-muted hover:text-text",
              )}
            >
              Solo registro · no afecta el cuadre
            </button>
            <p className="text-[0.7rem] text-faint">
              {medio === "registro"
                ? "Queda como préstamo por cobrar, pero no entra ni a la tirilla ni a la caja del cuadre."
                : "Transferencia entra al cuadre (tirilla); efectivo va a la caja (arqueo)."}
            </p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.82rem] text-danger">
              <Warning size={15} weight="fill" />
              {error}
            </div>
          )}

          <Button onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : "Registrar préstamo"}
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Préstamos de hoy</h3>
            <span className="text-[0.72rem] text-faint">{prestamos.length}</span>
          </div>

          {prestamos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[1rem] border border-dashed border-line-strong py-12 text-center">
              <HandCoins size={20} className="text-faint" />
              <p className="text-sm text-muted">Aún no hay préstamos registrados.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              <AnimatePresence initial={false}>
                {prestamos.map((d) => {
                  const saldado = d.saldo === 0;
                  const nuevo = !yaEstaban.has(d.id) && !reduced();
                  return (
                    <motion.li
                      key={d.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={
                        nuevo
                          ? { opacity: 1, y: 0, backgroundColor: ["rgba(29,158,117,0.2)", "rgba(29,158,117,0)"] }
                          : { opacity: 1, y: 0 }
                      }
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30, backgroundColor: { duration: 1.2, ease: "easeOut" } }}
                      className="rounded-lg py-2.5"
                    >
                      {editId === d.id ? (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {[...PERSONAS_PRESET, "Otro"].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setEPersona(p)}
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-[0.74rem] font-medium transition-colors",
                                  ePersona === p
                                    ? "lg-glass-accent text-glass-ink-accent"
                                    : "border-line-strong text-muted hover:text-text",
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          {ePersona === "Otro" && (
                            <Input value={eOtro} onChange={(e) => setEOtro(e.target.value)} placeholder="Nombre de la persona" />
                          )}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={eConcepto} onChange={(e) => setEConcepto(e.target.value)} placeholder="Concepto" />
                            <MoneyInput value={eMonto} onValueChange={setEMonto} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={guardarEdicion} disabled={pending}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={pending}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                saldado ? "bg-success-soft text-success" : "bg-accent-soft text-accent-strong",
                              )}
                            >
                              {saldado ? <CheckCircle size={16} weight="bold" /> : <HandCoins size={15} weight="bold" />}
                            </div>
                            <div className="min-w-0 leading-tight">
                              <p className="tnum text-[0.92rem] font-medium text-text">{formatCOP(d.monto)}</p>
                              <p className="flex items-center gap-1.5 truncate text-[0.7rem] text-faint">
                                <span className="truncate text-muted">{d.persona}</span>
                                {d.concepto && <span className="truncate">· {d.concepto}</span>}
                                <Clock size={10} />
                                {formatHoraISO(d.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => cambiarMedio(d)}
                              disabled={pending || bloqueado}
                              title="Cambiar: efectivo, transferencia o solo registro"
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[0.68rem] font-medium transition-colors disabled:opacity-50",
                                d.medio === "transferencia"
                                  ? "border-accent/30 bg-accent-soft text-accent-strong"
                                  : d.medio === "registro"
                                    ? "border-line-strong text-faint"
                                    : "border-line-strong text-muted hover:text-text",
                              )}
                            >
                              {d.medio === "transferencia" ? "Transf." : d.medio === "registro" ? "Solo reg." : "Efectivo"}
                            </button>
                            {saldado ? (
                              <>
                                <Badge tone="success">Devuelto</Badge>
                                {!bloqueado && (
                                  <button
                                    onClick={() => reabrir(d)}
                                    disabled={pending}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40"
                                    title="Deshacer pago (volver a pendiente)"
                                  >
                                    <ArrowCounterClockwise size={14} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {d.abonado > 0 && (
                                  <span className="tnum hidden text-[0.7rem] text-faint sm:inline">
                                    queda {formatCOP(d.saldo)}
                                  </span>
                                )}
                                <button
                                  onClick={() => pagar(d)}
                                  disabled={pending || bloqueado}
                                  className="rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-[0.72rem] font-medium text-success transition-colors hover:bg-success/15 disabled:opacity-40"
                                >
                                  Marcar devuelto
                                </button>
                              </>
                            )}
                            {!bloqueado && (
                              <button
                                onClick={() => abrirEdicion(d)}
                                disabled={pending}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40"
                                title="Editar"
                              >
                                <PencilSimple size={15} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => borrar(d.id)}
                                disabled={pending || bloqueado}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                                title="Eliminar"
                              >
                                <Trash size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </div>

      {/* Total pendiente */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card className="p-5 sm:p-6">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Pendiente del día</p>
          <p className="tnum mt-1 text-[1.9rem] font-semibold tracking-tight text-text">
            <AnimatedMoney value={pendiente} />
          </p>
          <div className="mt-4 flex flex-col divide-y divide-line text-[0.82rem]">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Prestado</span>
              <span className="tnum font-medium text-text">{formatCOP(prestado)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Devuelto hoy</span>
              <span className="tnum font-medium text-success">{formatCOP(devuelto)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
