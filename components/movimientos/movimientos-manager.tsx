"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  PencilSimple,
  ArrowUp,
  DeviceMobile,
  Bank,
  Receipt,
  ArrowRight,
  Lock,
  Check,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Contador } from "@/components/ui/contador";
import { Celdas, Celda } from "@/components/ui/celdas";
import { Baldosas, Baldosa } from "@/components/ui/baldosas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn, esEnter } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatHora } from "@/lib/format";
import type { MovimientoRow } from "@/lib/database.types";
import { agregarMovimiento, eliminarMovimiento, editarMovimiento } from "@/app/(app)/movimientos/actions";
import { reduced } from "@/components/fx/reduced";
import { TRANSICION } from "@/lib/movimiento";

type Tipo = "consignacion_nequi" | "consignacion_bancolombia" | "recaudo" | "retiro";

const TIPOS: Record<Tipo, { label: string; corto: string; icon: Icon; salida: boolean }> = {
  consignacion_nequi: { label: "Consignación a Nequi", corto: "Nequi", icon: DeviceMobile, salida: false },
  consignacion_bancolombia: { label: "Consignación a Bancolombia", corto: "Bancolombia", icon: Bank, salida: false },
  recaudo: { label: "Recaudo", corto: "Recaudo", icon: Receipt, salida: false },
  retiro: { label: "Retiro", corto: "Retiro", icon: ArrowUp, salida: true } };

/** Rótulo de cada total en las celdas del día. */
const TOTAL: Record<Tipo, string> = {
  consignacion_nequi: "Nequi",
  consignacion_bancolombia: "Bancolombia",
  recaudo: "Recaudos",
  retiro: "Retiros",
};

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MovimientosManager({
  fecha,
  movimientos,
  bloqueado,
  isAdmin }: {
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
  const [porBorrar, setPorBorrar] = useState<{ id: string; monto: number } | null>(null);

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
    setPorBorrar(null);
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
        convenio: eTipo === "recaudo" ? eConvenio.trim() || null : null });
      if (res.ok) {
        setEditId(null);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo editar.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-text">
              <h2>Registrar movimiento</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>

          {bloqueado && (
            <Alert variant="muted" className="mb-4">
              <Lock weight="fill" />
              <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo para editar.</AlertTitle>
            </Alert>
          )}

          <fieldset disabled={bloqueado} className="contents">
          {/* El tipo en baldosas: decide dónde cae la plata. El nombre largo va
              para el lector de pantalla. */}
          <Baldosas
            value={tipo}
            onValueChange={(v) => setTipo(v as Tipo)}
            disabled={bloqueado}
            aria-label="Tipo de movimiento"
            className="grid-cols-2 sm:grid-cols-4"
          >
            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
              const Ti = TIPOS[t];
              return (
                <Baldosa
                  key={t}
                  value={t}
                  aria-label={Ti.label}
                  icono={<Ti.icon />}
                  nombre={Ti.corto}
                  detalle={t.startsWith("consignacion") ? "Consignación" : undefined}
                />
              );
            })}
          </Baldosas>

          <div className="mt-4 grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-monto">Monto</Label>
              <MoneyInput id="mov-monto" size="lg" value={monto} onValueChange={setMonto} autoFocus onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            {tipo === "recaudo" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mov-convenio">Código de convenio</Label>
                <Input id="mov-convenio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Ej. 12345" inputMode="numeric" onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-cliente">{tipo === "recaudo" ? "Referencia o cliente" : "Cliente (opcional)"}</Label>
              <Input id="mov-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o referencia" onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()} />
            </div>
          </div>
          </fieldset>

          <ErrorNotice message={error} className="mt-4" />

          <Button onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : `Registrar ${tipo === "retiro" ? "retiro" : tipo === "recaudo" ? "recaudo" : "consignación"}`}
          </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center">
            <CardTitle className="text-text">
              <h3>Registrados</h3>
            </CardTitle>
            <CardAction className="self-center">
              <Contador n={movimientos.length} />
            </CardAction>
          </CardHeader>
          <CardContent>

          {movimientos.length === 0 ? (
            <Empty fila>
              <EmptyTitle>Aún no hay movimientos registrados</EmptyTitle>
            </Empty>
          ) : (
            <ItemGroup variant="cajitas" className="max-lg:divide-y max-lg:divide-linea-fila">
              <AnimatePresence initial={false}>
                {movimientos.map((m) => {
                  const Ti = TIPOS[m.tipo as Tipo] ?? TIPOS.consignacion_nequi;
                  const nuevo = !yaEstaban.has(m.id) && !reduced();
                  const detalle = [m.hora ? formatHora(m.hora) : null, [m.convenio, m.cliente].filter(Boolean).join(", ") || null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <motion.div
                      key={m.id}
                      role="listitem"
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={TRANSICION}
                      className={cn("rounded-xl", nuevo && "t-flash-ok")}
                    >
                      {editId === m.id ? (
                        // Edición en línea dentro de la misma cajita.
                        <Item className="flex-col items-stretch gap-2.5 px-0 py-3">
                          <ToggleGroup
                            type="single"
                            variant="segmentado"
                            value={eTipo}
                            onValueChange={(v) => v && setETipo(v as Tipo)}
                            aria-label="Tipo de movimiento"
                            className="w-full"
                          >
                            {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                              <ToggleGroupItem key={t} value={t} aria-label={TIPOS[t].label}>
                                {TIPOS[t].corto}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <MoneyInput value={eMonto} onValueChange={setEMonto} autoFocus aria-label="Monto" />
                            <Input
                              value={eCliente}
                              onChange={(e) => setECliente(e.target.value)}
                              placeholder={eTipo === "recaudo" ? "Referencia o cliente" : "Cliente (opcional)"}
                              aria-label={eTipo === "recaudo" ? "Referencia o cliente" : "Cliente"}
                            />
                          </div>
                          {eTipo === "recaudo" && (
                            <Input
                              value={eConvenio}
                              onChange={(e) => setEConvenio(e.target.value)}
                              placeholder="Código de convenio"
                              aria-label="Código de convenio"
                              inputMode="numeric"
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={guardarEdicion} disabled={pending}>
                              <Check size={16} weight="bold" />
                              Guardar
                            </Button>
                            <IconButton label="Cancelar" size="icon-sm" onClick={() => setEditId(null)} disabled={pending}>
                              <X size={17} />
                            </IconButton>
                          </div>
                        </Item>
                      ) : (
                        <Item className="flex-nowrap gap-3 px-0 py-2.5">
                          <ItemMedia variant="icon">
                            <Ti.icon size={16} weight="bold" />
                          </ItemMedia>
                          <ItemContent className="min-w-0 gap-0.5">
                            <ItemTitle className="w-full min-w-0 items-baseline gap-1.5">
                              <span className="tnum">{formatCOP(m.monto)}</span>
                              <span className="truncate text-meta font-normal text-muted">{Ti.corto}</span>
                            </ItemTitle>
                            {detalle && (
                              <ItemDescription className="truncate text-nowrap text-faint">{detalle}</ItemDescription>
                            )}
                          </ItemContent>
                          <ItemActions className="shrink-0 gap-1.5">
                            {!bloqueado && (
                              <IconButton label="Editar" onClick={() => abrirEdicion(m)} disabled={pending} className="lg:size-[38px]">
                                <PencilSimple size={17} />
                              </IconButton>
                            )}
                            {isAdmin && (
                              <IconButton
                                label="Borrar"
                                onClick={() => setPorBorrar({ id: m.id, monto: m.monto })}
                                disabled={pending || bloqueado}
                                peligro
                                className="lg:size-[38px]"
                              >
                                <Trash size={17} />
                              </IconButton>
                            )}
                          </ItemActions>
                        </Item>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </ItemGroup>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Totales por canal */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-text">
              <h3>Totales del día</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Celdas dos>
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <Celda key={t} rotulo={TOTAL[t]}>
                  <AnimatedMoney value={totales[t]} />
                </Celda>
              ))}
            </Celdas>
            <Button variant="outline" asChild className="mt-4 w-full">
              <Link href="/cuadre">
                Cuadre del día
                <ArrowRight weight="bold" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este movimiento?"
        monto={porBorrar?.monto ?? null}
        detalle="Queda registrado en la Bitácora."
        onConfirmar={() => porBorrar && borrar(porBorrar.id)}
        onCancelar={() => setPorBorrar(null)}
      />
    </div>
  );
}
