"use client";

import { Fragment, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  CaretRight,
  ArrowCounterClockwise,
  Tag,
  Check,
  X,
  Eraser,
  Coins,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Contador } from "@/components/ui/contador";
import { Plegable } from "@/components/ui/plegable";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { MedioPicker } from "@/components/prestamos/medio-picker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { cn, esEnter } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatFecha, hoyISO } from "@/lib/format";
import { PERSONAS_PRESET } from "@/lib/personas";
import type { DeudaConSaldo, PersonaGrupo } from "@/lib/queries";
import type { AbonoRow } from "@/lib/database.types";
import { claveNombre, origenesUsados, resumenOrigenes } from "@/lib/prestamos";
import {
  crearDeuda,
  agregarAbono,
  eliminarDeuda,
  reabrirPrestamo,
  etiquetarAbono,
} from "@/app/(app)/prestamos/actions";

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
  // Los orígenes que ya se usaron en cualquier préstamo, para no reescribirlos.
  const origenes = useMemo(
    () => origenesUsados(grupos.flatMap((g) => g.deudas.flatMap((d) => d.abonos))),
    [grupos],
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="min-w-0">
        <Card>
          <CardHeader className="items-center">
            <CardTitle className="flex items-center gap-2 text-text">
              <h2>Quién debe</h2>
              <Contador n={deben.length} />
            </CardTitle>
            {deben.length > 0 && (
              <p className="tnum text-meta text-faint">
                {deben.length === 1 ? "1 persona debe" : `${deben.length} personas deben`} {formatCOP(totalPendiente)}
              </p>
            )}
          </CardHeader>

          {deben.length === 0 ? (
            <CardContent>
              <Empty fila>
                <EmptyTitle>Nadie tiene préstamos pendientes</EmptyTitle>
                <EmptyDescription>Regístralo en Nuevo préstamo</EmptyDescription>
              </Empty>
            </CardContent>
          ) : (
            // En el computador cada persona es una cajita que se abre; en el
            // celular, renglones con su línea.
            <div className="flex flex-col px-5 pb-3 lg:gap-1.5 lg:px-3">
              <AnimatePresence initial={false}>
                {deben.map((g, i) => (
                  <PersonaCard
                    key={g.key}
                    grupo={g}
                    isAdmin={isAdmin}
                    origenes={origenes}
                    defaultOpen={i === 0 && deben.length <= 3}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {alDia.length > 0 && (
            <div className="border-t border-linea-fila px-5 py-1.5">
              <Plegable
                variante="fila"
                titulo={`${alDia.length === 1 ? "Persona" : "Personas"} al día`}
                contador={alDia.length}
              >
                <div className="flex flex-col pb-2 lg:gap-1.5">
                  {alDia.map((g) => (
                    <PersonaCard key={g.key} grupo={g} isAdmin={isAdmin} origenes={origenes} defaultOpen={false} />
                  ))}
                </div>
              </Plegable>
            </div>
          )}
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-8">
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
  // Sin premarcar: el medio decide si la plata sale del arqueo o de la tirilla,
  // y ningún valor domina lo suficiente para arriesgar un registro por inercia.
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "registro" | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [msg, setMsg] = useState<string | null>(null);

  const personaFinal = persona === "Otro" ? otro.trim() : persona;
  const conceptoFinal = concepto === "Otro" ? conceptoOtro.trim() : concepto;

  function registrar() {
    if (!personaFinal) return setMsg("Indica la persona.");
    if (monto <= 0) return setMsg("Ingresa un monto.");
    if (concepto === "Otro" && !conceptoOtro.trim()) return setMsg("Especifica el concepto.");
    if (!descripcion.trim()) return setMsg("Escribe el motivo (para qué fue el préstamo).");
    if (!medio) return setMsg("Indica cómo se lo diste: efectivo, transferencia o solo registro.");
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
        setOtro("");
        setConceptoOtro("");
        setMedio(null);
        toast.success("Préstamo registrado.");
        router.refresh();
      } else {
        setMsg(res.error ?? "No se pudo registrar el préstamo.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-text">Nuevo préstamo</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label id="grp-persona">Persona</Label>
          <div role="group" aria-labelledby="grp-persona" className="flex flex-wrap gap-2">
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
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id="grp-concepto">Concepto</Label>
          <div role="group" aria-labelledby="grp-concepto" className="flex flex-wrap gap-2">
            {CONCEPTOS.map((c) => (
              <ChoiceChip key={c} selected={concepto === c} onClick={() => setConcepto(c)}>
                {c}
              </ChoiceChip>
            ))}
          </div>
          {concepto === "Otro" && (
            <Input
              value={conceptoOtro}
              onChange={(e) => setConceptoOtro(e.target.value)}
              placeholder="Especifica el concepto"
              aria-label="Especifica el concepto"
              className="mt-1"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deuda-monto">Monto</Label>
          <MoneyInput id="deuda-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id="grp-medio">¿Cómo se lo diste?</Label>
          <MedioPicker medio={medio} onChange={setMedio} labelledBy="grp-medio" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deuda-desc">Motivo</Label>
            <Input id="deuda-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Para qué fue el préstamo" onKeyDown={(e) => esEnter(e) && !pending && registrar()} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deuda-fecha">Fecha</Label>
            <DatePicker id="deuda-fecha" value={fecha} onChange={setFecha} className="w-full sm:w-[9.5rem]" />
          </div>
        </div>

        <ErrorNotice message={msg} />

        <Button onClick={registrar} disabled={pending} className="mt-1.5">
          <Plus size={18} weight="bold" />
          {pending ? "Registrando…" : "Registrar préstamo"}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Una persona = una fila que se abre (plegable del taller): chevron a la
 * izquierda que gira 90°, iniciales, nombre, la pista solo cerrada, el saldo a
 * la derecha y la barra de lo abonado. Al abrir salen sus préstamos.
 */
function PersonaCard({
  grupo,
  isAdmin,
  origenes,
  defaultOpen,
}: {
  grupo: PersonaGrupo;
  isAdmin: boolean;
  origenes: string[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const alDia = grupo.saldo <= 0;
  const pct = grupo.total > 0 ? Math.min(100, (grupo.abonado / grupo.total) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="border-b border-linea-fila last:border-b-0 lg:rounded-xl lg:border lg:border-fila-borde lg:bg-fila lg:last:border-b"
    >
      <Collapsible asChild open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden">
        <CollapsibleTrigger className="group/persona flex w-full items-center gap-3 rounded-xl py-3 text-left transition-colors duration-[var(--dur-1)] outline-none hover:bg-fila-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid lg:px-3">
          <CaretRight
            aria-hidden
            weight="bold"
            className="size-3.5 shrink-0 text-muted transition-transform duration-[var(--dur-2)] ease-ios group-data-[state=open]/persona:rotate-90"
          />
          <Avatar size="lg" aria-hidden="true">
            <AvatarFallback className={cn(alDia && "bg-ok-bg text-ok-fg")}>{iniciales(grupo.persona)}</AvatarFallback>
          </Avatar>

          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-title font-semibold text-text">{grupo.persona}</span>
              {alDia && <Badge variant="success">Al día</Badge>}
            </span>
            {!open && (
              <span className="mt-0.5 block truncate text-meta text-muted">
                {alDia ? (
                  <>
                    {grupo.deudas.length} préstamo{grupo.deudas.length === 1 ? "" : "s"}
                    <span className="hidden sm:inline">, todo pagado</span>
                  </>
                ) : (
                  <>
                    {grupo.activos} pendiente{grupo.activos === 1 ? "" : "s"}
                    {/* El detalle del abono solo si cabe: en celular estorbaba y se cortaba. */}
                    <span className="hidden sm:inline">
                      , abonado {formatCOP(grupo.abonado)} de {formatCOP(grupo.total)}
                    </span>
                  </>
                )}
              </span>
            )}
          </span>

          <span className={cn("tnum shrink-0 text-lead font-semibold", alDia ? "text-ok-fg" : "text-text")}>
            {formatCOP(alDia ? 0 : grupo.saldo)}
          </span>
        </CollapsibleTrigger>

        {/* Sin abonos la barra es un riel gris decorativo: no se dibuja. */}
        {(grupo.abonado > 0 || alDia) && (
          <Progress
            value={pct}
            tono={alDia ? "ok" : "accent"}
            aria-label={`Abonado ${Math.round(pct)}%`}
            className="mb-3 ml-[4.25rem] w-auto lg:mr-3 lg:ml-[4.75rem]"
          />
        )}

        <CollapsibleContent className="plegable-cuerpo overflow-hidden">
          <ItemGroup className="border-t border-linea-fila lg:mx-3">
            {grupo.deudas.map((d, i) => (
              <Fragment key={d.id}>
                {i > 0 && <ItemSeparator />}
                <DeudaRow deuda={d} isAdmin={isAdmin} origenes={origenes} />
              </Fragment>
            ))}
          </ItemGroup>
        </CollapsibleContent>
      </div>
      </Collapsible>
    </motion.div>
  );
}

/**
 * De dónde sale la plata. Las fichas son los orígenes ya usados; tocar una llena
 * el campo y volver a tocarla lo vacía. El texto es la única fuente de verdad.
 */
function OrigenPicker({
  id,
  value,
  onChange,
  sugeridos,
  onEnter,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  sugeridos: string[];
  onEnter?: () => void;
}) {
  const clave = claveNombre(value);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>¿De dónde sale la plata?</Label>
      {sugeridos.length > 0 && (
        <div role="group" aria-label="Orígenes usados antes" className="flex flex-wrap gap-1.5">
          {sugeridos.slice(0, 8).map((o) => {
            const activo = clave !== "" && claveNombre(o) === clave;
            return (
              <ChoiceChip key={o} selected={activo} onClick={() => onChange(activo ? "" : o)}>
                {o}
              </ChoiceChip>
            );
          })}
        </div>
      )}
      <Input
        id={id}
        value={value}
        maxLength={40}
        onChange={(e) => onChange(e.target.value)}
        placeholder={sugeridos.length > 0 ? "U otro origen" : "Ej: taller, perfumes, sueldo"}
        onKeyDown={(e) => esEnter(e) && onEnter?.()}
      />
    </div>
  );
}

/** Un abono del historial. Tocar la etiqueta abre el editor del origen. */
function AbonoItem({ abono, origenes }: { abono: AbonoRow; origenes: string[] }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(abono.origen ?? "");
  const [err, setErr] = useState<string | null>(null);

  function guardar(nuevo: string) {
    setErr(null);
    startTransition(async () => {
      const res = await etiquetarAbono({ id: abono.id, origen: nuevo });
      if (!res.ok) {
        setErr(res.error ?? "No se pudo guardar el origen.");
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <Item role="listitem" size="sm" className="gap-0 rounded-none px-0 py-2">
      <div className="flex basis-full items-center gap-2 text-meta">
        <span className="shrink-0 text-faint">{formatFecha(abono.fecha)}</span>
        <Button
          size="sm"
          variant={abono.origen ? "secondary" : "ghost"}
          aria-expanded={editando}
          onClick={() => {
            setValor(abono.origen ?? "");
            setErr(null);
            setEditando((v) => !v);
          }}
          className="min-w-0 max-w-[60%]"
        >
          <Tag size={15} className="shrink-0" />
          <span className="truncate">{abono.origen ?? "Poner origen"}</span>
        </Button>
        <span className="tnum ml-auto shrink-0 text-body font-semibold text-ok-fg">+{formatCOP(abono.monto)}</span>
      </div>

      <AnimatePresence initial={false}>
        {editando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="basis-full overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-3 pb-1">
              <OrigenPicker
                id={id}
                value={valor}
                onChange={setValor}
                sugeridos={origenes}
                onEnter={() => !pending && guardar(valor)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => guardar(valor)} disabled={pending}>
                  <Check size={16} weight="bold" />
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
                {abono.origen && (
                  <Button size="sm" variant="secondary" onClick={() => guardar("")} disabled={pending}>
                    <Eraser size={16} />
                    Quitar origen
                  </Button>
                )}
                <IconButton label="Cancelar" size="icon-sm" onClick={() => setEditando(false)} className="ml-auto">
                  <X size={17} />
                </IconButton>
              </div>
              <ErrorNotice message={err} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Item>
  );
}

function DeudaRow({
  deuda,
  isAdmin,
  origenes,
}: {
  deuda: DeudaConSaldo;
  isAdmin: boolean;
  origenes: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [abono, setAbono] = useState(0);
  const [origen, setOrigen] = useState("");
  const [err, setErr] = useState<string | null>(null);
  // Confirmación propia para las dos acciones destructivas de la fila.
  const [confirmando, setConfirmando] = useState<null | "borrar" | "reabrir">(null);

  const pct = deuda.monto > 0 ? Math.min(100, (deuda.abonado / deuda.monto) * 100) : 0;
  const saldada = deuda.saldo <= 0;
  const porOrigen = resumenOrigenes(deuda.abonos);
  const hayOrigen = porOrigen.some((o) => o.origen !== null);

  function abonar() {
    if (abono <= 0) return;
    setErr(null);
    startTransition(async () => {
      const res = await agregarAbono({
        deuda_id: deuda.id,
        monto: Math.min(abono, deuda.saldo),
        nota: null,
        origen: origen || null,
      });
      if (res && !res.ok) {
        setErr(res.error ?? "No se pudo registrar el abono.");
        return;
      }
      setAbono(0);
      setOrigen("");
      setAbonoOpen(false);
      router.refresh();
    });
  }

  function borrar() {
    setConfirmando(null);
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
    setConfirmando(null);
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
    <Item role="listitem" className="items-start gap-x-3 gap-y-0 rounded-none px-0 py-3">
          <ItemContent className="min-w-0 gap-1">
            <ItemTitle className="flex-wrap gap-1.5 font-normal">
              {deuda.concepto && <Badge variant="secondary">{deuda.concepto}</Badge>}
              {saldada && <Badge variant="success">Pagado</Badge>}
              <span className="text-meta text-faint">{formatFecha(deuda.fecha)}</span>
            </ItemTitle>
            <ItemDescription className="line-clamp-1 text-body text-muted">
              {deuda.descripcion || "Sin motivo anotado"}
            </ItemDescription>
          </ItemContent>
          <ItemActions className="block shrink-0 text-right">
            <p className={cn("tnum text-title font-semibold", saldada ? "text-ok-fg" : "text-text")}>
              {saldada ? formatCOP(0) : formatCOP(deuda.saldo)}
            </p>
            {deuda.abonado > 0 && (
              <p className="tnum text-meta text-muted">de {formatCOP(deuda.monto)}</p>
            )}
          </ItemActions>

        <div className="min-w-0 basis-full">
        {deuda.abonado > 0 && !saldada && (
          <Progress value={pct} tono="ok" aria-label={`Abonado ${Math.round(pct)}%`} className="mt-2.5" />
        )}

        {/* Solo cuando hay al menos un origen: si todo está sin etiqueta no dice nada nuevo. */}
        {hayOrigen && (
          <p className="mt-2 text-meta leading-relaxed text-faint">
            Pagado con{" "}
            {porOrigen.map((o, i) => (
              // El separador va por fuera: así la línea puede partir entre orígenes.
              <Fragment key={o.origen ?? "sin-origen"}>
                {i > 0 && ", "}
                <span className="tnum whitespace-nowrap">
                  <span className={o.origen ? "font-medium text-muted" : undefined}>
                    {o.origen ?? "sin origen"}
                  </span>{" "}
                  {formatCOP(o.monto)}
                </span>
              </Fragment>
            ))}
          </p>
        )}

        {/* Acciones como íconos con su nombre en el globo. */}
        <ItemFooter className="mt-2 flex-wrap justify-start gap-1.5">
          {saldada ? (
            <IconButton label="Reabrir" size="icon-sm" onClick={() => setConfirmando("reabrir")} disabled={pending}>
              <ArrowCounterClockwise size={17} />
            </IconButton>
          ) : (
            <IconButton
              label="Abonar"
              size="icon-sm"
              onClick={() => setAbonoOpen((v) => !v)}
              disabled={pending}
              aria-expanded={abonoOpen}
              className={cn(abonoOpen && "bg-accent-soft text-accent hover:bg-accent-soft")}
            >
              <Coins size={18} />
            </IconButton>
          )}
          {isAdmin && (
            <IconButton label="Borrar préstamo" size="icon-sm" onClick={() => setConfirmando("borrar")} disabled={pending} peligro className="ml-auto">
              <Trash size={17} />
            </IconButton>
          )}
        </ItemFooter>

        <AnimatePresence>
          {abonoOpen && !saldada && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 pt-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`ab-${deuda.id}`}>Abono</Label>
                  <MoneyInput id={`ab-${deuda.id}`} value={abono} onValueChange={setAbono} onEnter={() => !pending && abonar()} />
                </div>
                <OrigenPicker
                  id={`or-${deuda.id}`}
                  value={origen}
                  onChange={setOrigen}
                  sugeridos={origenes}
                  onEnter={() => !pending && abonar()}
                />
                <Button size="sm" onClick={abonar} disabled={pending} className="self-start">
                  <Check size={16} weight="bold" />
                  {pending ? "Registrando…" : "Abonar"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ErrorNotice message={err} className="mt-3" />

        {deuda.abonos.length > 0 && (
          <Plegable
            variante="fila"
            titulo="Abonos"
            contador={deuda.abonos.length}
            abierto={historyOpen}
            onAbiertoChange={setHistoryOpen}
            className="mt-1"
          >
            <ItemGroup>
              {deuda.abonos.map((a, i) => (
                <Fragment key={a.id}>
                  {i > 0 && <ItemSeparator />}
                  <AbonoItem abono={a} origenes={origenes} />
                </Fragment>
              ))}
            </ItemGroup>
          </Plegable>
        )}
        </div>

      <ConfirmDialog
        open={confirmando !== null}
        titulo={confirmando === "reabrir" ? "¿Deshacer el último pago?" : "¿Borrar este préstamo?"}
        monto={confirmando === "borrar" ? deuda.monto : null}
        detalle={
          confirmando === "reabrir"
            ? "El préstamo vuelve a quedar pendiente."
            : `De ${deuda.persona}. Se elimina junto con todos sus abonos y no se puede deshacer.`
        }
        confirmar={confirmando === "reabrir" ? "Sí, deshacer" : "Sí, borrar"}
        onConfirmar={confirmando === "reabrir" ? reabrir : borrar}
        onCancelar={() => setConfirmando(null)}
      />
    </Item>
  );
}
