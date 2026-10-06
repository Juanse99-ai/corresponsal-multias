"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandCoins,
  Plus,
  Trash,
  PencilSimple,
  Check,
  Clock,
  CheckCircle,
  Lock,
  ArrowCounterClockwise,
  X,
  DotsThree,
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Contador } from "@/components/ui/contador";
import { Celdas, Celda } from "@/components/ui/celdas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      {/* Registro + lista */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-text">
              <h2>Registrar préstamo</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>

          {bloqueado && (
            <Alert variant="muted" className="mb-4">
              <Lock weight="fill" />
              <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo.</AlertTitle>
            </Alert>
          )}

          <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
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
                  aria-label="Nombre de la persona"
                  className="mt-1"
                  onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()}
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-concepto">Motivo</Label>
              <Input
                id="pr-concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Préstamo personal, adelanto…"
                onKeyDown={(e) => esEnter(e) && !pending && !bloqueado && registrar()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-monto">Monto</Label>
              <MoneyInput id="pr-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && !bloqueado && registrar()} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label id="grp-devuelto">¿Ya lo devolvió?</Label>
              <ToggleGroup
                type="single"
                variant="segmentado"
                value={pagado ? "devuelto" : "pendiente"}
                onValueChange={(v) => v && setPagado(v === "devuelto")}
                aria-labelledby="grp-devuelto"
              >
                <ToggleGroupItem value="pendiente">
                  <Clock />
                  Pendiente
                </ToggleGroupItem>
                <ToggleGroupItem value="devuelto">
                  <CheckCircle />
                  Devuelto
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-1.5">
            <Label id="grp-medio-dia">¿Cómo se lo diste?</Label>
            <MedioPicker medio={medio} onChange={setMedio} labelledBy="grp-medio-dia" efectivoPrimero />
          </div>

          <ErrorNotice message={error} className="mt-4" />

          <Button variant="secondary" onClick={registrar} disabled={pending || bloqueado} className="mt-5 w-full sm:w-auto">
            <Plus size={18} weight="bold" />
            {pending ? "Registrando…" : "Registrar préstamo"}
          </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center">
            <CardTitle className="text-text">
              <h3>Préstamos del día</h3>
            </CardTitle>
            <CardAction className="self-center">
              <Contador n={prestamos.length} />
            </CardAction>
          </CardHeader>
          <CardContent>

          {prestamos.length === 0 ? (
            <Empty fila>
              <EmptyTitle>Aún no hay préstamos registrados</EmptyTitle>
            </Empty>
          ) : (
            <ItemGroup variant="cajitas" className="max-lg:divide-y max-lg:divide-linea-fila">
              <AnimatePresence initial={false}>
                {prestamos.map((d) => {
                  const saldado = d.saldo === 0;
                  const nuevo = !yaEstaban.has(d.id) && !reduced();
                  // Mismo ícono que en el formulario: así se reconoce sin leer.
                  const m = (d.medio in ICONO_MEDIO ? d.medio : "efectivo") as Medio;
                  const IconoMedio = ICONO_MEDIO[m];
                  const conMenu = !bloqueado || isAdmin;
                  return (
                    <motion.div
                      key={d.id}
                      role="listitem"
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      className={cn("rounded-xl", nuevo && "t-flash-ok")}
                    >
                      {editId === d.id ? (
                        // Edición en línea dentro de la misma cajita.
                        <Item className="flex-col items-stretch gap-2.5 px-0 py-3">
                          <div role="group" aria-label="A quién" className="flex flex-wrap gap-1.5">
                            {[...PERSONAS_PRESET, "Otro"].map((p) => (
                              <ChoiceChip key={p} selected={ePersona === p} onClick={() => setEPersona(p)}>
                                {p}
                              </ChoiceChip>
                            ))}
                          </div>
                          {ePersona === "Otro" && (
                            <Input value={eOtro} onChange={(e) => setEOtro(e.target.value)} placeholder="Nombre de la persona" aria-label="Nombre de la persona" />
                          )}
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input value={eConcepto} onChange={(e) => setEConcepto(e.target.value)} placeholder="Concepto" aria-label="Concepto" />
                            <MoneyInput value={eMonto} onValueChange={setEMonto} aria-label="Monto" />
                          </div>
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
                          <ItemMedia variant="icon" className={cn(saldado && "bg-ok-bg text-ok-fg")}>
                            {saldado ? <CheckCircle size={16} weight="bold" /> : <HandCoins size={16} weight="bold" />}
                          </ItemMedia>
                          <ItemContent className="min-w-0 gap-0.5">
                            <ItemTitle className="w-full min-w-0 gap-2">
                              <span className="tnum">{formatCOP(d.monto)}</span>
                              {saldado && <Badge variant="success">Devuelto</Badge>}
                            </ItemTitle>
                            <ItemDescription className="truncate text-nowrap text-faint">
                              {[d.persona, d.concepto].filter(Boolean).join(", ")} · {formatHoraISO(d.created_at)}
                              {!saldado && d.abonado > 0 && <span className="tnum">, queda {formatCOP(d.saldo)}</span>}
                            </ItemDescription>
                          </ItemContent>
                          {/* Solo íconos, máximo tres: medio, devuelto (o deshacer) y más. */}
                          <ItemActions className="shrink-0 gap-1.5">
                            <IconButton
                              label={`Cambiar medio (${NOMBRE_MEDIO[m]})`}
                              onClick={() => cambiarMedio(d)}
                              disabled={pending || bloqueado}
                              className="lg:size-[38px]"
                            >
                              <IconoMedio size={17} />
                            </IconButton>
                            {saldado ? (
                              !bloqueado && (
                                <IconButton
                                  label="Deshacer pago"
                                  onClick={() => setConfirmar({ tipo: "reabrir", d })}
                                  disabled={pending}
                                  className="lg:size-[38px]"
                                >
                                  <ArrowCounterClockwise size={17} />
                                </IconButton>
                              )
                            ) : (
                              <IconButton
                                label="Marcar devuelto"
                                onClick={() => pagar(d)}
                                disabled={pending || bloqueado}
                                className="lg:size-[38px]"
                              >
                                <CheckCircle size={18} />
                              </IconButton>
                            )}
                            {conMenu && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton label="Más" disabled={pending} className="lg:size-[38px]">
                                    <DotsThree size={20} weight="bold" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!bloqueado && (
                                    <DropdownMenuItem onSelect={() => abrirEdicion(d)}>
                                      <PencilSimple />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {isAdmin && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={bloqueado}
                                      onSelect={() => setConfirmar({ tipo: "borrar", d })}
                                    >
                                      <Trash />
                                      Borrar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        <Card className="p-5">
          <p className="text-meta font-medium text-faint">Pendiente del día</p>
          <AnimatedMoney
            value={pendiente}
            className="mt-1 block text-kpi leading-none font-semibold tracking-[-0.6px] text-text"
          />
          <Celdas dos className="mt-4">
            <Celda rotulo="Prestado">{formatCOP(prestado)}</Celda>
            <Celda rotulo="Devuelto" tono="ok">
              {formatCOP(devuelto)}
            </Celda>
          </Celdas>
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
