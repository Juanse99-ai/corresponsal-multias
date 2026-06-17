"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  Clock,
  ArrowDown,
  ArrowUp,
  DeviceMobile,
  Bank,
  Warning,
  ArrowRight,
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
import { agregarMovimiento, eliminarMovimiento } from "@/app/(app)/movimientos/actions";

type Tipo = "consignacion" | "retiro" | "nequi" | "bancolombia";

const TIPOS: Record<Tipo, { label: string; icon: Icon; salida: boolean }> = {
  consignacion: { label: "Consignación", icon: ArrowDown, salida: false },
  retiro: { label: "Retiro", icon: ArrowUp, salida: true },
  nequi: { label: "Nequi", icon: DeviceMobile, salida: false },
  bancolombia: { label: "Bancolombia", icon: Bank, salida: false },
};

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MovimientosManager({ fecha, movimientos }: { fecha: string; movimientos: MovimientoRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<Tipo>("consignacion");
  const [monto, setMonto] = useState(0);
  const [cliente, setCliente] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totales = useMemo(() => {
    const t: Record<Tipo, number> = { consignacion: 0, retiro: 0, nequi: 0, bancolombia: 0 };
    for (const m of movimientos) t[m.tipo as Tipo] = (t[m.tipo as Tipo] ?? 0) + m.monto;
    return t;
  }, [movimientos]);

  function registrar() {
    if (monto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    startTransition(async () => {
      const res = await agregarMovimiento({ fecha, tipo, monto, hora: horaActual(), cliente: cliente || null });
      if (res.ok) {
        setMonto(0);
        setCliente("");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function borrar(id: string) {
    startTransition(async () => {
      await eliminarMovimiento(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-text">Registrar movimiento</h2>
          <p className="text-sm text-muted">A medida que pasan las operaciones del día.</p>

          <div className="mt-4 flex flex-wrap gap-2">
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
                      ? "border-accent/40 bg-accent-soft text-accent-strong"
                      : "border-line-strong text-muted hover:text-text",
                  )}
                >
                  <Ti.icon size={14} weight="bold" />
                  {Ti.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-monto">Monto</Label>
              <MoneyInput id="mov-monto" value={monto} onValueChange={setMonto} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-cliente">Cliente (opcional)</Label>
              <Input id="mov-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o referencia" />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-[--radius-card] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.82rem] text-danger">
              <Warning size={15} weight="fill" />
              {error}
            </div>
          )}

          <Button onClick={registrar} disabled={pending} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : `Registrar ${TIPOS[tipo].label.toLowerCase()}`}
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
                  const Ti = TIPOS[m.tipo as Tipo] ?? TIPOS.consignacion;
                  return (
                    <motion.li
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full",
                            Ti.salida ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-strong",
                          )}
                        >
                          <Ti.icon size={15} weight="bold" />
                        </div>
                        <div className="leading-tight">
                          <p className="tnum text-[0.92rem] font-medium text-text">{formatCOP(m.monto)}</p>
                          <p className="flex items-center gap-1.5 text-[0.7rem] text-faint">
                            <span>{Ti.label}</span>
                            {m.hora && (
                              <>
                                <Clock size={10} />
                                {formatHora(m.hora)}
                              </>
                            )}
                            {m.cliente && <span className="truncate">· {m.cliente}</span>}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => borrar(m.id)}
                        disabled={pending}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                        title="Eliminar"
                      >
                        <Trash size={15} />
                      </button>
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
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Ti.icon size={15} className={Ti.salida ? "text-danger" : "text-accent"} />
                    {Ti.label}
                  </span>
                  <span className="tnum text-[0.92rem] font-semibold text-text">
                    <AnimatedMoney value={totales[t]} />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Link href="/cuadre" className="group">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-line-strong">
            <div>
              <p className="text-[0.88rem] font-medium text-text">El cuadre se llena solo</p>
              <p className="text-[0.74rem] text-faint">Estos totales pasan al cuadre del día.</p>
            </div>
            <ArrowRight size={18} className="text-accent transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
