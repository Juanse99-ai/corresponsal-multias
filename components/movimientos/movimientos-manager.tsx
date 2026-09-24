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
  ArrowRight,
  Lock,
  Check,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ChoiceChip } from "@/components/ui/choice-chip";
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

type Tipo = "consignacion_nequi" | "consignacion_bancolombia" | "recaudo" | "retiro";

const TIPOS: Record<Tipo, { label: string; corto: string; icon: Icon; salida: boolean }> = {
  consignacion_nequi: { label: "Consignación a Nequi", corto: "a Nequi", icon: DeviceMobile, salida: false },
  consignacion_bancolombia: { label: "Consignación a Bancolombia", corto: "a Bancolombia", icon: Bank, salida: false },
  recaudo: { label: "Recaudo", corto: "Recaudo", icon: Receipt, salida: false },
  retiro: { label: "Retiro", corto: "Retiro", icon: ArrowUp, salida: true } };

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
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-text">
              <h2>Registrar movimiento</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>

          {bloqueado && (
            <Alert variant="muted" className="mt-4">
              <Lock weight="fill" />
              <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo para editar.</AlertTitle>
            </Alert>
          )}

          <div className={cn("mt-4 flex flex-wrap gap-2", bloqueado && "pointer-events-none opacity-50")}>
            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
              const Ti = TIPOS[t];
              return (
                <ChoiceChip key={t} selected={tipo === t} onClick={() => setTipo(t)} icon={<Ti.icon size={15} weight="bold" />}>
                  {Ti.label}
                </ChoiceChip>
              );
            })}
          </div>

          <div className={cn("mt-4 grid gap-4 sm:grid-cols-2", bloqueado && "pointer-events-none opacity-50")}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-monto">Monto</Label>
              <MoneyInput id="mov-monto" size="lg" value={monto} onValueChange={setMonto} autoFocus onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            {tipo === "recaudo" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="mov-convenio">Código de convenio</Label>
                <Input id="mov-convenio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Ej. 12345" inputMode="numeric" onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mov-cliente">{tipo === "recaudo" ? "Referencia o cliente" : "Cliente (opcional)"}</Label>
              <Input id="mov-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o referencia" onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()} />
            </div>
          </div>

          <ErrorNotice message={error} className="mt-4" />

          <Button onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : `Registrar ${TIPOS[tipo].corto.toLowerCase()}`}
          </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center pb-3">
            <CardTitle className="text-text">
              <h3>Movimientos de hoy</h3>
            </CardTitle>
            <CardAction className="row-span-1 self-center text-[0.72rem] text-faint">{movimientos.length}</CardAction>
          </CardHeader>
          <CardContent>

          {movimientos.length === 0 ? (
            <Empty className="gap-2 rounded-[1rem] border border-dashed border-line-strong py-12 md:py-12">
              <EmptyHeader>
                <EmptyMedia className="mb-0 text-faint">
                  <ArrowDown size={20} />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-normal tracking-normal text-muted">Aún no hay movimientos registrados.</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {movimientos.map((m) => {
                  const Ti = TIPOS[m.tipo as Tipo] ?? TIPOS.consignacion_nequi;
                  const nuevo = !yaEstaban.has(m.id) && !reduced();
                  return (
                    <motion.div
                      key={m.id}
                      role="listitem"
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      className={cn("rounded-lg", nuevo && "t-flash-ok")}
                    >
                      {editId === m.id ? (
                        <div className="flex flex-col gap-2.5 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
                              const Te = TIPOS[t];
                              return (
                                <ChoiceChip key={t} selected={eTipo === t} onClick={() => setETipo(t)} icon={<Te.icon size={15} weight="bold" />}>
                                  {Te.corto}
                                </ChoiceChip>
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
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={guardarEdicion} disabled={pending}>
                              <Check size={16} weight="bold" />
                              Guardar
                            </Button>
                            <IconButton label="Cancelar" onClick={() => setEditId(null)} disabled={pending} className="text-muted hover:text-foreground">
                              <X size={17} />
                            </IconButton>
                          </div>
                        </div>
                      ) : (
                        <Item className="flex-nowrap gap-3 rounded-none px-0 py-2.5">
                            <ItemMedia
                              className={cn(
                                "size-9 rounded-full",
                                Ti.salida ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-strong",
                              )}
                            >
                              <Ti.icon size={15} weight="bold" />
                            </ItemMedia>
                            <ItemContent className="min-w-0 gap-0 leading-tight">
                              <ItemTitle className="tnum text-[0.92rem] leading-tight text-text">{formatCOP(m.monto)}</ItemTitle>
                              <ItemDescription className="flex items-center gap-1.5 text-[0.7rem] leading-tight text-faint">
                                <span className="truncate">{Ti.corto}</span>
                                {m.hora && (
                                  <span className="inline-flex shrink-0 items-center gap-1">
                                    <Clock size={10} />
                                    {formatHora(m.hora)}
                                  </span>
                                )}
                                {m.convenio && <span className="truncate">· conv. {m.convenio}</span>}
                                {m.cliente && <span className="truncate">· {m.cliente}</span>}
                              </ItemDescription>
                            </ItemContent>
                          <ItemActions className="shrink-0 gap-1">
                            {!bloqueado && (
                              <IconButton label="Editar" onClick={() => abrirEdicion(m)} disabled={pending} className="text-muted hover:text-foreground">
                                <PencilSimple size={17} />
                              </IconButton>
                            )}
                            {isAdmin && (
                              <IconButton
                                label="Eliminar"
                                onClick={() => setPorBorrar({ id: m.id, monto: m.monto })}
                                disabled={pending || bloqueado}
                                className="text-muted hover:text-destructive"
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
          <CardHeader className="pb-3">
            <CardTitle className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Totales del día</CardTitle>
          </CardHeader>
          <CardContent>
          <ItemGroup className="divide-y divide-line">
            {(Object.keys(TIPOS) as Tipo[]).map((t) => {
              const Ti = TIPOS[t];
              return (
                <Item key={t} role="listitem" className="flex-nowrap gap-2 rounded-none px-0 py-2.5">
                  <ItemMedia>
                    <Ti.icon size={15} className={cn("shrink-0", Ti.salida ? "text-danger" : "text-accent")} />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="block w-full truncate font-normal text-muted">{Ti.label}</ItemTitle>
                  </ItemContent>
                  <ItemActions className="tnum shrink-0 text-[0.92rem] font-semibold text-text">
                    <AnimatedMoney value={totales[t]} />
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
          </CardContent>
        </Card>

        <Card className="group transition-colors hover:border-line-strong">
          <Item asChild className="rounded-[inherit] p-5">
            <Link href="/cuadre">
              <ItemContent>
                <ItemTitle className="text-[0.88rem] text-text">Cuadre del día</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ArrowRight size={18} className="text-accent transition-transform group-hover:translate-x-1" />
              </ItemActions>
            </Link>
          </Item>
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
