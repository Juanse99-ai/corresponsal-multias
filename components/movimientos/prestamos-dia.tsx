"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HandCoins, Plus, Trash, PencilSimple, Check, Clock, CheckCircle, Lock, ArrowCounterClockwise, X } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { MedioPicker, ICONO_MEDIO, NOMBRE_MEDIO, type Medio } from "@/components/prestamos/medio-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn, esEnter } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatHoraISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo } from "@/lib/queries";
import { registrarPrestamoDia, marcarPrestamoPagado, reabrirPrestamo, eliminarDeuda, editarDeuda } from "@/app/(app)/prestamos/actions";
import { reduced } from "@/components/fx/reduced";

export function PrestamosDia({
  fecha,
  prestamos,
  isAdmin,
  bloqueado }: {
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
  // Sin premarcar (igual que en /prestamos): el medio decide dónde cae la plata.
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "registro" | null>(null);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Confirmación propia para las dos acciones destructivas.
  const [confirmar, setConfirmar] = useState<null | { tipo: "borrar" | "reabrir"; d: DeudaConSaldo }>(null);

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
    if (!medio) return setError("Indica cómo se lo diste: efectivo, transferencia o solo registro.");
    setError(null);
    startTransition(async () => {
      const res = await registrarPrestamoDia({
        fecha,
        persona: personaFinal,
        concepto: concepto.trim(),
        monto,
        medio,
        pagado });
      if (res.ok) {
        setPersona("");
        setOtro("");
        setConcepto("");
        setMonto(0);
        setMedio(null);
        setPagado(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function pagar(d: DeudaConSaldo) {
    startTransition(async () => {
      const res = await marcarPrestamoPagado({ deuda_id: d.id, monto: d.saldo });
      if (res && !res.ok) {
        setError(res.error ?? "No se pudo marcar como pagado.");
        return;
      }
      router.refresh();
    });
  }

  function reabrir(d: DeudaConSaldo) {
    setConfirmar(null);
    startTransition(async () => {
      const res = await reabrirPrestamo(d.id);
      if (res && !res.ok) setError(res.error ?? "No se pudo deshacer.");
      router.refresh();
    });
  }

  function borrar(id: string) {
    setConfirmar(null);
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
        monto: eMonto });
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
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <HandCoins size={15} weight="bold" />
              </span>
              <h2>Préstamos del día</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>

          {bloqueado && (
            <Alert variant="muted" className="mt-4">
              <Lock weight="fill" />
              <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo.</AlertTitle>
            </Alert>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label id="grp-persona-dia">A quién</Label>
              <div role="group" aria-labelledby="grp-persona-dia" className="flex flex-wrap gap-2">
                {[...PERSONAS_PRESET, "Otro"].map((p) => (
                  <ChoiceChip key={p} selected={persona === p} onClick={() => setPersona(p)}>
                    {p}
                  </ChoiceChip>
                ))}
              </div>
              {persona === "Otro" && (
                <Input
                  value={otro}
                  onChange={(e) => setOtro(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="mt-1"
                  onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()}
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
                onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-monto">Monto</Label>
              <MoneyInput id="pr-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            <div className="flex flex-col gap-2">
              <Label id="grp-devuelto">¿Ya lo devolvió?</Label>
              <div role="group" aria-labelledby="grp-devuelto" className="grid grid-cols-2 gap-2">
                <ChoiceChip selected={!pagado} onClick={() => setPagado(false)} icon={<Clock size={15} />} className="w-full">
                  Pendiente
                </ChoiceChip>
                <ChoiceChip selected={pagado} onClick={() => setPagado(true)} icon={<CheckCircle size={15} />} className="w-full">
                  Devuelto
                </ChoiceChip>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Label id="grp-medio-dia">¿Cómo se lo diste?</Label>
            <MedioPicker medio={medio} onChange={setMedio} labelledBy="grp-medio-dia" efectivoPrimero />
          </div>

          <ErrorNotice message={error} className="mt-4" />

          <Button onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : "Registrar préstamo"}
          </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center pb-3">
            <CardTitle className="text-text">
              <h3>Préstamos de hoy</h3>
            </CardTitle>
            <CardAction className="row-span-1 self-center text-[0.72rem] text-faint">{prestamos.length}</CardAction>
          </CardHeader>
          <CardContent>

          {prestamos.length === 0 ? (
            <Empty className="gap-2 rounded-[1rem] border border-dashed border-line-strong py-12 md:py-12">
              <EmptyHeader>
                <EmptyMedia className="mb-0 text-faint">
                  <HandCoins size={20} />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-normal tracking-normal text-muted">Aún no hay préstamos registrados.</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {prestamos.map((d) => {
                  const saldado = d.saldo === 0;
                  const nuevo = !yaEstaban.has(d.id) && !reduced();
                  return (
                    <motion.div
                      key={d.id}
                      role="listitem"
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      className={cn("rounded-lg", nuevo && "t-flash-ok")}
                    >
                      {editId === d.id ? (
                        <div className="flex flex-col gap-2.5 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {[...PERSONAS_PRESET, "Otro"].map((p) => (
                              <ChoiceChip key={p} selected={ePersona === p} onClick={() => setEPersona(p)}>
                                {p}
                              </ChoiceChip>
                            ))}
                          </div>
                          {ePersona === "Otro" && (
                            <Input value={eOtro} onChange={(e) => setEOtro(e.target.value)} placeholder="Nombre de la persona" />
                          )}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={eConcepto} onChange={(e) => setEConcepto(e.target.value)} placeholder="Concepto" />
                            <MoneyInput value={eMonto} onValueChange={setEMonto} />
                          </div>
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
                        <Item className="justify-between gap-x-3 gap-y-2 rounded-none px-0 py-2.5">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <ItemMedia
                              className={cn(
                                "size-9 rounded-full",
                                saldado ? "bg-success-soft text-success" : "bg-accent-soft text-accent-strong",
                              )}
                            >
                              {saldado ? <CheckCircle size={16} weight="bold" /> : <HandCoins size={15} weight="bold" />}
                            </ItemMedia>
                            <ItemContent className="min-w-0 gap-0 leading-tight">
                              <ItemTitle className="tnum text-[0.92rem] leading-tight text-text">{formatCOP(d.monto)}</ItemTitle>
                              <ItemDescription className="flex items-center gap-1.5 truncate text-[0.7rem] leading-tight text-faint">
                                <span className="truncate text-muted">{d.persona}</span>
                                {d.concepto && <span className="truncate">· {d.concepto}</span>}
                                <Clock size={10} />
                                {formatHoraISO(d.created_at)}
                              </ItemDescription>
                            </ItemContent>
                          </div>
                          <ItemActions className="w-full shrink-0 flex-wrap justify-end gap-1.5 sm:w-auto">
                            {(() => {
                              // Mismo ícono que en el formulario: así se reconoce sin leer.
                              const m = (d.medio in ICONO_MEDIO ? d.medio : "efectivo") as Medio;
                              const Icono = ICONO_MEDIO[m];
                              return (
                                <IconButton
                                  label={`${NOMBRE_MEDIO[m]} · tocar para cambiar`}
                                  onClick={() => cambiarMedio(d)}
                                  disabled={pending || bloqueado}
                                  className={m === "transferencia" ? "text-accent-strong" : "text-muted hover:text-foreground"}
                                >
                                  <Icono size={17} />
                                </IconButton>
                              );
                            })()}
                            {saldado ? (
                              <>
                                <Badge variant="success">Devuelto</Badge>
                                {!bloqueado && (
                                  <IconButton
                                    label="Deshacer pago"
                                    onClick={() => setConfirmar({ tipo: "reabrir", d })}
                                    disabled={pending}
                                    className="text-muted hover:text-foreground"
                                  >
                                    <ArrowCounterClockwise size={17} />
                                  </IconButton>
                                )}
                              </>
                            ) : (
                              <>
                                {d.abonado > 0 && (
                                  <span className="tnum hidden text-[0.7rem] text-faint sm:inline">
                                    queda {formatCOP(d.saldo)}
                                  </span>
                                )}
                                {/* En celular va de último y a lo ancho: así los íconos no se parten en dos filas. */}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => pagar(d)}
                                  disabled={pending || bloqueado}
                                  className="order-last w-full sm:order-none sm:w-auto"
                                >
                                  <CheckCircle size={16} weight="bold" className="text-success" />
                                  Marcar devuelto
                                </Button>
                              </>
                            )}
                            {!bloqueado && (
                              <IconButton label="Editar" onClick={() => abrirEdicion(d)} disabled={pending} className="text-muted hover:text-foreground">
                                <PencilSimple size={17} />
                              </IconButton>
                            )}
                            {isAdmin && (
                              <IconButton
                                label="Eliminar"
                                onClick={() => setConfirmar({ tipo: "borrar", d })}
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

      {/* Total pendiente */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card className="p-5 sm:p-6">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Pendiente del día</p>
          <p className="tnum mt-1 text-[1.9rem] font-semibold tracking-tight text-text">
            <AnimatedMoney value={pendiente} />
          </p>
          <ItemGroup className="mt-4 divide-y divide-line text-[0.82rem]">
            <Item role="listitem" className="justify-between rounded-none p-0 py-2 text-[0.82rem]">
              <span className="text-muted">Prestado</span>
              <span className="tnum font-medium text-text">{formatCOP(prestado)}</span>
            </Item>
            <Item role="listitem" className="justify-between rounded-none p-0 py-2 text-[0.82rem]">
              <span className="text-muted">Devuelto hoy</span>
              <span className="tnum font-medium text-success">{formatCOP(devuelto)}</span>
            </Item>
          </ItemGroup>
        </Card>
      </div>
      <ConfirmDialog
        open={!!confirmar}
        titulo={confirmar?.tipo === "reabrir" ? "¿Deshacer el pago?" : "¿Borrar este préstamo?"}
        monto={confirmar?.tipo === "borrar" ? confirmar.d.monto : null}
        detalle={
          confirmar?.tipo === "reabrir"
            ? "El préstamo vuelve a quedar pendiente."
            : "Queda registrado en la Bitácora."
        }
        confirmar={confirmar?.tipo === "reabrir" ? "Sí, deshacer" : "Sí, borrar"}
        onConfirmar={() => {
          if (!confirmar) return;
          if (confirmar.tipo === "reabrir") reabrir(confirmar.d);
          else borrar(confirmar.d.id);
        }}
        onCancelar={() => setConfirmar(null)}
      />
    </div>
  );
}
