"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FloppyDisk,
  Wallet,
  Warning,
  CheckCircle,
  ArrowUpRight,
  Lock,
  LockOpen,
  Coins,
  ArrowClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Badge } from "@/components/ui/badge";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import {
  computeSaldoFinal,
  sumaComponentes,
  isDescuadre,
  efectivoParaCuadrar,
  efectivoEsperadoCaja,
  type EstadoCuadre,
} from "@/lib/cuadre";
import { guardarCuadre } from "@/app/(app)/cuadre/actions";

interface Inicial {
  total_tirilla: number;
  efectivo_consignaciones: number;
  retiros_cash: number;
  nequis: number;
  bancolombia: number;
  prestamos_consignaciones: number;
  ret_real: number;
  compensado: number;
  fondo_caja: number;
  efectivo_contado: number;
  estado: EstadoCuadre;
  nota: string;
}

interface Props {
  fecha: string;
  srLuis: number;
  consignacionesCount: number;
  existente: boolean;
  inicial: Inicial;
  isAdmin: boolean;
  soportesCount: number;
  movCount: number;
  prestamosCount: number;
  prestamosDiaTotal: number;
  movTotales: { consignacion_nequi: number; consignacion_bancolombia: number; retiro: number };
}

export function CuadreEditor({
  fecha,
  srLuis,
  consignacionesCount,
  existente,
  inicial,
  isAdmin,
  soportesCount,
  movCount,
  prestamosCount,
  prestamosDiaTotal,
  movTotales,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const [vals, setVals] = useState({
    total_tirilla: inicial.total_tirilla,
    efectivo_consignaciones: inicial.efectivo_consignaciones,
    retiros_cash: inicial.retiros_cash,
    nequis: inicial.nequis,
    bancolombia: inicial.bancolombia,
    prestamos_consignaciones: inicial.prestamos_consignaciones,
    ret_real: inicial.ret_real,
    compensado: inicial.compensado,
    fondo_caja: inicial.fondo_caja,
    efectivo_contado: inicial.efectivo_contado,
  });
  const [estado, setEstado] = useState<EstadoCuadre>(inicial.estado);
  const [nota, setNota] = useState(inicial.nota);

  const set = (k: keyof typeof vals) => (n: number) => setVals((s) => ({ ...s, [k]: n }));

  function traerDeMovimientos() {
    setVals((s) => ({
      ...s,
      nequis: movTotales.consignacion_nequi,
      bancolombia: movTotales.consignacion_bancolombia,
      ret_real: movTotales.retiro,
      prestamos_consignaciones: prestamosDiaTotal,
    }));
  }

  const valores = { ...vals, sr_luis: srLuis };
  const saldo = useMemo(() => computeSaldoFinal(valores), [valores]);
  const suma = useMemo(() => sumaComponentes(valores), [valores]);
  const descuadre = isDescuadre(saldo);
  const efectivoNecesario = useMemo(() => efectivoParaCuadrar(valores), [valores]);
  const esperadoCaja = useMemo(
    () =>
      efectivoEsperadoCaja({
        fondo_caja: vals.fondo_caja,
        efectivo_consignaciones: vals.efectivo_consignaciones,
        ret_real: vals.ret_real,
        compensado: vals.compensado,
        prestamos_consignaciones: vals.prestamos_consignaciones,
      }),
    [vals],
  );
  const diferenciaCaja = vals.efectivo_contado - esperadoCaja;
  // Anti-tamper: un dia cerrado solo lo edita el admin.
  const locked = inicial.estado === "cerrado" && !isAdmin;

  const lineas = [
    { label: "Sr. Luis", value: srLuis },
    { label: "Efectivo (consignaciones)", value: vals.efectivo_consignaciones },
    { label: "Compensado", value: vals.compensado },
    { label: "Nequis", value: vals.nequis },
    { label: "Bancolombia", value: vals.bancolombia },
    { label: "Préstamos / consig.", value: vals.prestamos_consignaciones },
    { label: "Retiros", value: vals.ret_real },
  ];

  function onGuardar(nuevoEstado?: EstadoCuadre) {
    const estadoFinal = nuevoEstado ?? estado;
    setToast(null);
    if (estadoFinal === "cerrado" && soportesCount === 0) {
      setToast({ ok: false, msg: "Adjunta la tirilla del datáfono (abajo) antes de cerrar el día." });
      return;
    }
    startTransition(async () => {
      const res = await guardarCuadre({
        fecha,
        ...vals,
        estado: estadoFinal,
        nota: nota.trim() || null,
      });
      if (res.ok) {
        setEstado(estadoFinal);
        setToast({
          ok: true,
          msg: estadoFinal === "cerrado" ? "Día cerrado y guardado." : "Cuadre guardado.",
        });
        router.refresh();
      } else {
        setToast({ ok: false, msg: res.error ?? "No se pudo guardar." });
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* ====== Columna de captura ====== */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold tracking-tight text-text">Movimientos del día</h2>
            <p className="text-sm text-muted">Ingresa los totales al cerrar la jornada.</p>
          </div>
          <Badge tone={estado === "cerrado" ? "success" : "neutral"}>
            {estado === "cerrado" ? <Lock size={12} weight="fill" /> : <LockOpen size={12} />}
            {estado === "cerrado" ? "Cerrado" : "Abierto"}
          </Badge>
        </div>

        {locked && (
          <div className="mb-4 flex items-center gap-2 rounded-[--radius-card] border border-line-strong bg-surface-2 px-3.5 py-2.5 text-[0.82rem] text-muted">
            <Lock size={15} weight="fill" className="text-accent" />
            Día cerrado. Solo Juan puede reabrirlo para editar.
          </div>
        )}

        <fieldset disabled={locked} className="contents">

        {/* Total tirilla destacado */}
        <div className="rounded-[1rem] border border-accent/25 bg-accent-soft/40 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="total_tirilla">Total tirilla</Label>
            <span className="text-[0.7rem] text-faint">Reporte Bancolombia del día</span>
          </div>
          <div className="mt-2">
            <MoneyInput id="total_tirilla" size="lg" value={vals.total_tirilla} onValueChange={set("total_tirilla")} />
          </div>
        </div>

        {/* Sr. Luis (lectura) */}
        <Link
          href="/luis"
          className="group mt-4 flex items-center justify-between rounded-[1rem] border border-line bg-surface-2 p-4 transition-colors hover:border-line-strong"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Wallet size={18} weight="fill" />
            </div>
            <div className="leading-tight">
              <p className="text-[0.82rem] font-medium text-text">Sr. Luis</p>
              <p className="text-[0.72rem] text-faint">
                {consignacionesCount} consignación{consignacionesCount === 1 ? "" : "es"} · toca para registrar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="tnum text-base font-semibold text-text">{formatCOP(srLuis)}</span>
            <ArrowUpRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>

        {(movCount > 0 || prestamosCount > 0) && (
          <button
            type="button"
            onClick={traerDeMovimientos}
            className="mt-4 flex w-full items-center justify-between rounded-[--radius-card] border border-accent/25 bg-accent-soft/40 px-4 py-2.5 text-[0.82rem] transition-colors hover:bg-accent-soft"
          >
            <span className="flex items-center gap-2 text-muted">
              <ArrowClockwise size={14} className="text-accent" />
              Traer totales de{" "}
              {[
                movCount > 0 ? `${movCount} movimiento${movCount === 1 ? "" : "s"}` : null,
                prestamosCount > 0 ? `${prestamosCount} préstamo${prestamosCount === 1 ? "" : "s"}` : null,
              ]
                .filter(Boolean)
                .join(" y ")}{" "}
              del día
            </span>
            <span className="font-medium text-accent-strong">Aplicar</span>
          </button>
        )}

        {/* Desglose */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Efectivo (consignaciones)" id="efectivo_consignaciones">
            <MoneyInput id="efectivo_consignaciones" value={vals.efectivo_consignaciones} onValueChange={set("efectivo_consignaciones")} />
          </Campo>
          <Campo label="Compensado" id="compensado" hint="Efectivo propio que llevas al banco">
            <MoneyInput id="compensado" value={vals.compensado} onValueChange={set("compensado")} />
          </Campo>
          <Campo label="Nequis" id="nequis">
            <MoneyInput id="nequis" value={vals.nequis} onValueChange={set("nequis")} />
          </Campo>
          <Campo label="Bancolombia" id="bancolombia">
            <MoneyInput id="bancolombia" value={vals.bancolombia} onValueChange={set("bancolombia")} />
          </Campo>
          <Campo label="Préstamos / consignaciones" id="prestamos_consignaciones">
            <MoneyInput id="prestamos_consignaciones" value={vals.prestamos_consignaciones} onValueChange={set("prestamos_consignaciones")} />
          </Campo>
          <Campo label="Retiros" id="ret_real">
            <MoneyInput id="ret_real" value={vals.ret_real} onValueChange={set("ret_real")} />
          </Campo>
        </div>

        {/* Indicador: efectivo necesario para cuadrar */}
        <div className="mt-4 flex items-center justify-between rounded-[--radius-card] border border-accent/25 bg-accent-soft/50 px-4 py-3">
          <div className="flex items-center gap-2 text-[0.82rem] text-muted">
            <Coins size={15} weight="fill" className="text-accent" />
            Para cuadrar, el efectivo debería sumar
          </div>
          <span className="tnum text-[0.95rem] font-semibold text-accent-strong">
            {formatCOP(efectivoNecesario)}
          </span>
        </div>

        {/* Arqueo de caja física */}
        <div className="mt-4 rounded-[1rem] border border-line bg-surface-2/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={15} weight="fill" className="text-accent" />
            <h3 className="text-[0.85rem] font-semibold text-text">Arqueo de caja</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Fondo en caja" id="fondo_caja" hint="Base que dejas (varía)">
              <MoneyInput id="fondo_caja" value={vals.fondo_caja} onValueChange={set("fondo_caja")} />
            </Campo>
            <Campo label="Efectivo contado" id="efectivo_contado" hint="Lo que cuentas físico">
              <MoneyInput id="efectivo_contado" value={vals.efectivo_contado} onValueChange={set("efectivo_contado")} />
            </Campo>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-line text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Esperado en caja</span>
              <span className="tnum text-text">{formatCOP(esperadoCaja)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-text">Diferencia</span>
              <span className={cn("tnum font-semibold", diferenciaCaja === 0 ? "text-success" : "text-danger")}>
                {diferenciaCaja > 0 ? "+" : ""}
                {formatCOP(diferenciaCaja)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-[0.68rem] leading-relaxed text-faint">
            Esperado = fondo + efectivo que entró − retiros − compensado (banco) − préstamos.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="nota">Nota (opcional)</Label>
          <textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Observación del día…"
            className="w-full resize-none rounded-[--radius-card] border border-line-strong bg-surface-2 p-3 text-sm text-text placeholder:text-faint focus:border-accent/60 focus:bg-surface focus:outline-none"
          />
        </div>
        </fieldset>
      </Card>

      {/* ====== Columna de resultado ====== */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <SaldoHero saldo={saldo} descuadre={descuadre} estado={estado} />

        <Card className="p-5">
          <p className="mb-3 text-[0.78rem] font-medium uppercase tracking-wide text-faint">Cómo cuadra</p>
          <div className="flex flex-col divide-y divide-line">
            {lineas.map((l) => (
              <div key={l.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted">{l.label}</span>
                <span className="tnum text-text">{formatCOP(l.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[0.82rem] font-medium text-text">Suma componentes</span>
              <span className="tnum text-[0.82rem] font-semibold text-text">{formatCOP(suma)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[0.82rem] font-medium text-text">Total tirilla</span>
              <span className="tnum text-[0.82rem] font-semibold text-text">{formatCOP(vals.total_tirilla)}</span>
            </div>
          </div>
        </Card>

        {/* Estado + guardar */}
        <Card className="flex flex-col gap-3 p-5">
          {locked ? (
            <div className="flex items-center gap-2 rounded-[--radius-card] border border-line-strong bg-surface-2 px-3.5 py-3 text-[0.82rem] text-muted">
              <Lock size={16} weight="fill" className="text-accent" />
              Día cerrado. Solo Juan puede reabrirlo.
            </div>
          ) : (
            <>
              <div className="flex rounded-[--radius-card] border border-line bg-surface-2 p-1">
                {(["abierto", "cerrado"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEstado(e)}
                    className={cn(
                      "relative flex-1 rounded-[0.7rem] py-2 text-[0.8rem] font-medium capitalize transition-colors",
                      estado === e ? "text-text" : "text-faint hover:text-muted",
                    )}
                  >
                    {estado === e && (
                      <motion.span
                        layoutId="estado-pill"
                        className="absolute inset-0 rounded-[0.7rem] border border-line-strong bg-elevated"
                        transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{e}</span>
                  </button>
                ))}
              </div>

              <Button onClick={() => onGuardar()} disabled={pending} className="w-full">
                <FloppyDisk size={18} weight="fill" />
                {pending ? "Guardando…" : existente ? "Guardar cambios" : "Guardar cuadre"}
              </Button>

              {estado !== "cerrado" && (
                <Button variant="secondary" onClick={() => onGuardar("cerrado")} disabled={pending} className="w-full">
                  <Lock size={16} />
                  Cerrar el día
                </Button>
              )}

              {isAdmin && inicial.estado === "cerrado" && estado === "cerrado" && (
                <p className="text-center text-[0.72rem] text-faint">
                  Para reabrir: cambia a “Abierto” y guarda los cambios.
                </p>
              )}
            </>
          )}

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "flex items-center gap-2 rounded-[--radius-card] px-3.5 py-2.5 text-[0.82rem]",
                  toast.ok
                    ? "border border-success/30 bg-success-soft text-success"
                    : "border border-danger/30 bg-danger-soft text-danger",
                )}
              >
                {toast.ok ? <CheckCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

function Campo({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-right text-[0.66rem] leading-tight text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SaldoHero({
  saldo,
  descuadre,
  estado,
}: {
  saldo: number;
  descuadre: boolean;
  estado: EstadoCuadre;
}) {
  const faltan = saldo > 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-6 transition-colors",
        descuadre ? "border-danger/40" : "border-success/40",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl",
          descuadre ? "bg-danger/20" : "bg-success/20",
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Saldo final</p>
          <Badge tone={descuadre ? "danger" : "success"}>
            {descuadre ? <Warning size={12} weight="fill" /> : <CheckCircle size={12} weight="fill" />}
            {descuadre ? "Descuadre" : "Cuadrado"}
          </Badge>
        </div>
        <p className={cn("mt-2 text-4xl font-semibold tracking-tight", descuadre ? "text-danger" : "text-success")}>
          <AnimatedMoney value={saldo} />
        </p>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">
          {descuadre
            ? faltan
              ? `Faltan ${formatCOP(saldo)} por registrar para que la tirilla cuadre.`
              : `Sobran ${formatCOP(Math.abs(saldo))} sin justificar. Revisa los movimientos del día.`
            : estado === "cerrado"
              ? "El día cerró perfecto. Nada pendiente."
              : "Todo cuadra. Puedes cerrar el día."}
        </p>
      </div>
    </Card>
  );
}
