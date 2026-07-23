"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  PencilSimple,
  Clock,
  ArrowDown,
  ArrowUp,
  DeviceMobile,
  Bank,
  Receipt,
  Warning,
  ArrowRight,
  Lock,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP, formatHora } from "@/lib/format";
import type { MovimientoRow } from "@/lib/database.types";
import { agregarMovimiento, eliminarMovimiento, editarMovimiento } from "@/app/(app)/movimientos/actions";
import { reduced } from "@/components/fx/reduced";

type Tipo = "consignacion_nequi" | "consignacion_bancolombia" | "recaudo" | "retiro";

const TIPOS: Record<Tipo, { label: string; corto: string; icon: Icon; salida: boolean }> = {
  consignacion_nequi: { label: "Consignación a Nequi", corto: "a Nequi", icon: DeviceMobile, salida: false },
  consignacion_bancolombia: { label: "Consignación a Bancolombia", corto: "a Bancolombia", icon: Bank, salida: false },
  recaudo: { label: "Recaudo", corto: "Recaudo", icon: Receipt, salida: false },
  retiro: { label: "Retiro", corto: "Retiro", icon: ArrowUp, salida: true },
};

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MovimientosManager({
  fecha,
  movimientos,
  bloqueado,
  isAdmin,
}: {
  fecha: string;
  movimientos: MovimientoRow[];
  bloqueado?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<Tipo>("consignacion_nequi");
  const [monto, setMonto] = useState(0);
  const [cliente, setCliente] = useState("");
  const [convenio, setConvenio] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edición inline de un movimiento existente.
  const [editId, setEditId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState<Tipo>("consignacion_nequi");
  const [eMonto, setEMonto] = useState(0);
  const [eCliente, setECliente] = useState("");
  const [eConvenio, setEConvenio] = useState("");

  // Filas presentes al cargar; las que aparecen después (recién registradas) hacen flash verde.
  const idsIniciales = useRef<Set<string> | null>(null);
  const yaEstaban = (idsIniciales.current ??= new Set(movimientos.map((m) => m.id)));

  const totales = useMemo(() => {
    const t: Record<Tipo, number> = { consignacion_nequi: 0, consignacion_bancolombia: 0, recaudo: 0, retiro: 0 };
    for (const m of movimientos) t[m.tipo as Tipo] = (t[m.tipo as Tipo] ?? 0) + m.monto;
    return t;
  }, [movimientos]);

  function registrar() {
    if (bloqueado) return;
    if (monto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    startTransition(async () => {
      const res = await agregarMovimiento({ fecha, tipo, monto, hora: horaActual(), cliente: cliente || null, convenio: convenio || null });
      if (res.ok) {
        setMonto(0);
        setCliente("");
        setConvenio("");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function borrar(id: string) {
    if (!window.confirm("¿Borrar este movimiento? Queda registrado en la Bitácora.")) return;
    startTransition(async () => {
      const res = await eliminarMovimiento(id);
      if (res && !res.ok) setError(res.error ?? "No se pudo borrar.");
      router.refresh();
    });
  }

  function abrirEdicion(m: MovimientoRow) {
    setEditId(m.id);
    setETipo(m.tipo as Tipo);
    setEMonto(m.monto);
    setECliente(m.cliente ?? "");
    setEConvenio(m.convenio ?? "");
    setError(null);
  }

  function guardarEdicion() {
    if (!editId) return;
    if (eMonto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    startTransition(async () => {
      const res = await editarMovimiento({
        id: editId,
        tipo: eTipo,
        monto: eMonto,
        cliente: eCliente.trim() || null,
        convenio: eTipo === "recaudo" ? eConvenio.trim() || null : null,
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
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-text">Registrar movimiento</h2>

          {bloqueado && (
            <div className="mt-4 flex items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3.5 py-2.5 text-[0.82rem] text-muted">
              <Lock size={15} weight="fill" className="text-accent" />
              Día cerrado. Solo Juan puede reabrirlo para editar.
            </div>
          )}

          <div className={cn("mt-4 flex flex-wrap gap-2", bloqueado && "pointer-events-none opacity-50")}>
            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
              const Ti = TIPOS[t];
              const active = tipo === t;
              return (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
                    active
                      ? "lg-glass-accent text-glass-ink-accent"
                      : "border-line-strong text-muted hover:text-text",
                  )}
                >
                  <Ti.icon size={14} weight="bold" />
                  {Ti.label}
                </button>
              );
            })}
          </div>

          <div className={cn("mt-4 grid gap-4 sm:grid-cols-2", bloqueado && "pointer-events-none opacity-50")}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-monto">Monto</Label>
              <MoneyInput id="mov-monto" value={monto} onValueChange={setMonto} autoFocus onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            {tipo === "recaudo" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="mov-convenio">Código de convenio</Label>
                <Input id="mov-convenio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Ej. 12345" inputMode="numeric" onEnter={() => !pending && !bloqueado && registrar()} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-cliente">{tipo === "recaudo" ? "Referencia o cliente" : "Cliente (opcional)"}</Label>
              <Input id="mov-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o referencia" onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.82rem] text-danger">
              <Warning size={15} weight="fill" />
              {error}
            </div>
          )}

          <Button onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : `Registrar ${TIPOS[tipo].corto.toLowerCase()}`}
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Movimientos de hoy</h3>
            <span className="text-[0.72rem] text-faint">{movimientos.length}</span>
          </div>

          {movimientos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[1rem] border border-dashed border-line-strong py-12 text-center">
              <ArrowDown size={20} className="text-faint" />
              <p className="text-sm text-muted">Aún no hay movimientos registrados.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              <AnimatePresence initial={false}>
                {movimientos.map((m) => {
                  const Ti = TIPOS[m.tipo as Tipo] ?? TIPOS.consignacion_nequi;
                  const nuevo = !yaEstaban.has(m.id) && !reduced();
                  return (
                    <motion.li
                      key={m.id}
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
                      {editId === m.id ? (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
                              const Te = TIPOS[t];
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setETipo(t)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.74rem] font-medium transition-colors",
                                    eTipo === t
                                      ? "lg-glass-accent text-glass-ink-accent"
                                      : "border-line-strong text-muted hover:text-text",
                                  )}
                                >
                                  <Te.icon size={12} weight="bold" />
                                  {Te.corto}
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <MoneyInput value={eMonto} onValueChange={setEMonto} autoFocus />
                            <Input
                              value={eCliente}
                              onChange={(e) => setECliente(e.target.value)}
                              placeholder={eTipo === "recaudo" ? "Referencia o cliente" : "Cliente (opcional)"}
                            />
                          </div>
                          {eTipo === "recaudo" && (
                            <Input
                              value={eConvenio}
                              onChange={(e) => setEConvenio(e.target.value)}
                              placeholder="Código de convenio"
                              inputMode="numeric"
                            />
                          )}
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
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                Ti.salida ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-strong",
                              )}
                            >
                              <Ti.icon size={15} weight="bold" />
                            </div>
                            <div className="min-w-0 leading-tight">
                              <p className="tnum text-[0.92rem] font-medium text-text">{formatCOP(m.monto)}</p>
                              <p className="flex items-center gap-1.5 text-[0.7rem] text-faint">
                                <span className="truncate">{Ti.corto}</span>
                                {m.hora && (
                                  <span className="inline-flex shrink-0 items-center gap-1">
                                    <Clock size={10} />
                                    {formatHora(m.hora)}
                                  </span>
                                )}
                                {m.convenio && <span className="truncate">· conv. {m.convenio}</span>}
                                {m.cliente && <span className="truncate">· {m.cliente}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!bloqueado && (
                              <button
                                onClick={() => abrirEdicion(m)}
                                disabled={pending}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40"
                                title="Editar"
                              >
                                <PencilSimple size={15} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => borrar(m.id)}
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

      {/* Totales por canal */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card className="p-5 sm:p-6">
          <p className="mb-3 text-[0.78rem] font-medium uppercase tracking-wide text-faint">Totales del día</p>
          <div className="flex flex-col divide-y divide-line">
            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
              const Ti = TIPOS[t];
              return (
                <div key={t} className="flex items-center justify-between py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
                    <Ti.icon size={15} className={cn("shrink-0", Ti.salida ? "text-danger" : "text-accent")} />
                    <span className="truncate">{Ti.label}</span>
                  </span>
                  <span className="tnum shrink-0 text-[0.92rem] font-semibold text-text">
                    <AnimatedMoney value={totales[t]} />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Link href="/cuadre" className="group">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-line-strong">
            <p className="text-[0.88rem] font-medium text-text">Cuadre del día</p>
            <ArrowRight size={18} className="text-accent transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
