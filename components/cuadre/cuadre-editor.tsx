"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FloppyDisk,
  Wallet,
  Warning,
  CheckCircle,
  ArrowUpRight,
  Lock,
  LockOpen,
  ArrowClockwise,
  Receipt,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { SaldoVivo } from "@/components/fx/saldo-vivo";
import { CelebracionCierre } from "@/components/fx/celebracion-cierre";
import { ripple } from "@/components/fx/ripple";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import { useMontado } from "@/lib/use-montado";
import {
  computeSaldoFinal,
  sumaComponentes,
  isDescuadre,
  efectivoEsperadoCaja,
  type EstadoCuadre,
} from "@/lib/cuadre";
import { guardarCuadre } from "@/app/(app)/cuadre/actions";
import { CuadreExport } from "@/components/cuadre/cuadre-export";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Inicial {
  total_tirilla: number;
  efectivo_consignaciones: number;
  retiros_cash: number;
  nequis: number;
  bancolombia: number;
  recaudos: number;
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
  nombre: string;
  soportesCount: number;
  movCount: number;
  prestamosCount: number;
  prestamosTransferDia: number;
  prestamosEfectivoDia: number;
  movTotales: { consignacion_nequi: number; consignacion_bancolombia: number; retiro: number; recaudo: number };
}

type Borrador = Partial<Pick<Inicial, "total_tirilla" | "compensado" | "fondo_caja" | "efectivo_contado" | "nota">>;

/** Borrador local del día, o null si no hay o no se puede leer. */
function leerBorrador(key: string): Borrador | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null; // localStorage no disponible: seguimos sin borrador
  }
}

export function CuadreEditor({
  fecha,
  srLuis,
  consignacionesCount,
  existente,
  inicial,
  isAdmin,
  nombre,
  soportesCount,
  movCount,
  prestamosCount,
  prestamosTransferDia,
  prestamosEfectivoDia,
  movTotales,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [celebrar, setCelebrar] = useState(0);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const [vals, setVals] = useState({
    total_tirilla: inicial.total_tirilla,
    efectivo_consignaciones: inicial.efectivo_consignaciones,
    retiros_cash: inicial.retiros_cash,
    nequis: inicial.nequis,
    bancolombia: inicial.bancolombia,
    recaudos: inicial.recaudos,
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
      recaudos: movTotales.recaudo,
      ret_real: movTotales.retiro,
      prestamos_consignaciones: prestamosTransferDia,
    }));
  }

  const valores = { ...vals, sr_luis: srLuis };
  const saldo = computeSaldoFinal(valores);
  const suma = sumaComponentes(valores);
  const descuadre = isDescuadre(saldo);
  // Día recién abierto y sin tirilla: no se habla de sobra ni de falta todavía.
  const sinEmpezar = vals.total_tirilla === 0 && !existente;
  // Efectivo que entró por consignaciones (Nequi + Bancolombia, pagadas en efectivo).
  const consignacionesCash = vals.nequis + vals.bancolombia + vals.recaudos;
  const esperadoCaja = useMemo(
    () =>
      efectivoEsperadoCaja({
        fondo_caja: vals.fondo_caja,
        consignaciones_cash: consignacionesCash,
        ret_real: vals.ret_real,
        prestamos_efectivo: prestamosEfectivoDia,
        compensado: vals.compensado,
      }),
    [vals, consignacionesCash, prestamosEfectivoDia],
  );
  const diferenciaCaja = vals.efectivo_contado - esperadoCaja;
  // Un solo umbral para pintar y para bloquear el cierre: antes se pintaba con
  // === 0 y se bloqueaba con Math.round(...) !== 0, que no es lo mismo.
  const cajaCuadra = Math.round(diferenciaCaja) === 0;
  // Anti-tamper: un dia cerrado solo lo edita el admin.
  const locked = inicial.estado === "cerrado" && !isAdmin;

  // Borrador local: lo que se escribe a mano (sobre todo la tirilla) no se pierde
  // si recargas, cambias de pantalla o de dia. Los campos que salen de movimientos
  // (Nequis, Bancolombia, etc.) NO se guardan aqui: siempre se traen frescos.
  // Un dia cerrado en el servidor siempre manda: no se restaura un borrador encima.
  const draftKey = `corr-cuadre-draft:${fecha}`;
  // Se aplica una sola vez, en el primer render del navegador: justo al hidratar, o de
  // entrada si se llega navegando. Va en el render y no en un efecto para que, al llegar
  // navegando, no se pinte primero lo del servidor y un instante después el borrador.
  const montado = useMontado();
  const [hydrated, setHydrated] = useState(false);
  if (montado && !hydrated) {
    setHydrated(true);
    const d = inicial.estado === "cerrado" ? null : leerBorrador(draftKey);
    if (d) {
      setVals((s) => ({
        ...s,
        total_tirilla: typeof d.total_tirilla === "number" ? d.total_tirilla : s.total_tirilla,
        compensado: typeof d.compensado === "number" ? d.compensado : s.compensado,
        fondo_caja: typeof d.fondo_caja === "number" ? d.fondo_caja : s.fondo_caja,
        efectivo_contado: typeof d.efectivo_contado === "number" ? d.efectivo_contado : s.efectivo_contado,
      }));
      if (typeof d.nota === "string") setNota(d.nota);
    }
  }
  useEffect(() => {
    if (!hydrated || locked) return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          total_tirilla: vals.total_tirilla,
          compensado: vals.compensado,
          fondo_caja: vals.fondo_caja,
          efectivo_contado: vals.efectivo_contado,
          nota,
        }),
      );
    } catch {
      /* sin localStorage no guardamos borrador, no es critico */
    }
  }, [vals.total_tirilla, vals.compensado, vals.fondo_caja, vals.efectivo_contado, nota, hydrated, locked, draftKey]);

  // El saldo final cuadra SOLO lo electrónico (lo que pasó por Bancolombia).
  const lineas = [
    { label: "Sr. Luis", value: srLuis },
    { label: "Nequis", value: vals.nequis },
    { label: "Bancolombia", value: vals.bancolombia },
    { label: "Recaudos", value: vals.recaudos },
    { label: "Préstamos por transferencia", value: vals.prestamos_consignaciones },
  ];

  /** Texto de por qué no cuadra, para el diálogo de cierre. */
  const motivoDescuadre = (() => {
    const partes: string[] = [];
    if (descuadre) partes.push(`el saldo final es ${formatCOP(saldo)}`);
    if (!cajaCuadra)
      partes.push(`en la caja ${diferenciaCaja > 0 ? "sobran" : "faltan"} ${formatCOP(Math.abs(diferenciaCaja))}`);
    return partes.join(" y ");
  })();

  function onGuardar(nuevoEstado?: EstadoCuadre) {
    const estadoFinal = nuevoEstado ?? estado;
    if (estadoFinal === "cerrado") {
      if (soportesCount === 0) {
        toast.error("Adjunta la tirilla del datáfono (abajo) antes de cerrar el día.");
        return;
      }
      if (descuadre || !cajaCuadra) {
        // Exige explicación escrita (queda para Juan) y confirmación antes de cerrar descuadrado.
        if (!nota.trim()) {
          toast.error("El día no cuadra. Escribe en la nota por qué, antes de cerrarlo.");
          return;
        }
        setConfirmarCierre(true);
        return;
      }
    }
    guardar(estadoFinal);
  }

  function guardar(estadoFinal: EstadoCuadre) {
    setConfirmarCierre(false);
    startTransition(async () => {
      const res = await guardarCuadre({
        fecha,
        ...vals,
        estado: estadoFinal,
        nota: nota.trim() || null,
      });
      if (res.ok) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* nada */
        }
        setEstado(estadoFinal);
        if (estadoFinal === "cerrado") setCelebrar((c) => c + 1);
        toast.success(estadoFinal === "cerrado" ? "Día cerrado y guardado." : "Cuadre guardado.");
        router.refresh();
      } else {
        toast.error(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
      {/* ====== Columna de captura ====== */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h2 className="truncate text-[0.95rem] font-semibold tracking-tight text-text">Movimientos del día</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CuadreExport
              fecha={fecha}
              lineas={lineas}
              suma={suma}
              tirilla={vals.total_tirilla}
              saldo={saldo}
              descuadre={descuadre}
              estado={estado}
              arqueo={{
                entro: consignacionesCash,
                retiros: vals.ret_real,
                prestamosEfectivo: prestamosEfectivoDia,
                compensado: vals.compensado,
                esperado: esperadoCaja,
                contado: vals.efectivo_contado,
                diferencia: diferenciaCaja,
              }}
            />
            <Badge variant={estado === "cerrado" ? "success" : "secondary"}>
              {estado === "cerrado" ? <Lock size={12} weight="fill" /> : <LockOpen size={12} />}
              {estado === "cerrado" ? "Cerrado" : "Abierto"}
            </Badge>
          </div>
        </div>

        {locked && (
          <Alert variant="muted" className="mb-4">
            <Lock weight="fill" />
            <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo para editar.</AlertTitle>
          </Alert>
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
        <Item
          asChild
          variant="outline"
          className="mt-4 flex-nowrap gap-3 rounded-[1rem] border-line bg-surface-2 hover:border-line-strong"
        >
          <Link href="/luis">
            <ItemMedia className="h-10 w-10 rounded-full bg-accent-soft text-accent-strong group-has-[[data-slot=item-description]]/item:translate-y-0 group-has-[[data-slot=item-description]]/item:self-center">
              <Wallet size={18} weight="fill" />
            </ItemMedia>
            <ItemContent className="min-w-0 gap-0 leading-tight">
              <ItemTitle className="text-[0.82rem] leading-tight text-text">Sr. Luis</ItemTitle>
              <ItemDescription className="truncate text-[0.72rem] leading-tight text-faint">
                {consignacionesCount} {consignacionesCount === 1 ? "consignación" : "consignaciones"} · toca para registrar
              </ItemDescription>
            </ItemContent>
            <ItemActions className="shrink-0 pl-2">
              <span className="tnum text-base font-semibold text-text">{formatCOP(srLuis)}</span>
              <ArrowUpRight size={16} className="text-faint transition-transform group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5" />
            </ItemActions>
          </Link>
        </Item>

        {(movCount > 0 || prestamosCount > 0) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                onClick={(e) => {
                  ripple(e);
                  traerDeMovimientos();
                }}
                className="mt-4 w-full"
              >
                <ArrowClockwise size={16} weight="bold" />
                Traer totales del día
                <Badge variant="info" className="tnum text-[0.72rem] font-semibold">
                  {movCount + prestamosCount}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {[
                movCount > 0 ? `${movCount} movimiento${movCount === 1 ? "" : "s"}` : null,
                prestamosCount > 0 ? `${prestamosCount} préstamo${prestamosCount === 1 ? "" : "s"}` : null,
              ]
                .filter(Boolean)
                .join(" y ")}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Desglose electrónico (lo que pasó por Bancolombia) */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nequis" id="nequis_e">
            <MoneyInput id="nequis_e" value={vals.nequis} onValueChange={set("nequis")} />
          </Campo>
          <Campo label="Bancolombia" id="bancolombia_e">
            <MoneyInput id="bancolombia_e" value={vals.bancolombia} onValueChange={set("bancolombia")} />
          </Campo>
          <Campo label="Recaudos" id="recaudos_e">
            <MoneyInput id="recaudos_e" value={vals.recaudos} onValueChange={set("recaudos")} />
          </Campo>
          <Campo label="Préstamos por transferencia" id="prestamos_consignaciones">
            <MoneyInput id="prestamos_consignaciones" value={vals.prestamos_consignaciones} onValueChange={set("prestamos_consignaciones")} />
          </Campo>
          <Campo label="Compensado" id="compensado">
            <MoneyInput id="compensado" value={vals.compensado} onValueChange={set("compensado")} />
          </Campo>
          <Campo label="Retiros" id="ret_real">
            <MoneyInput id="ret_real" value={vals.ret_real} onValueChange={set("ret_real")} />
          </Campo>
        </div>

        {/* Arqueo de caja física */}
        <div className="mt-4 rounded-[1rem] border border-line bg-surface-2/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={15} weight="fill" className="text-accent" />
            <h3 className="text-[0.85rem] font-semibold text-text">Arqueo de caja</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Fondo en caja" id="fondo_caja">
              <MoneyInput id="fondo_caja" value={vals.fondo_caja} onValueChange={set("fondo_caja")} />
            </Campo>
            <Campo label="Efectivo contado" id="efectivo_contado">
              <MoneyInput id="efectivo_contado" value={vals.efectivo_contado} onValueChange={set("efectivo_contado")} />
            </Campo>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-line text-[0.82rem]">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Efectivo que entró (consignaciones)</span>
              <span className="tnum text-text">{formatCOP(consignacionesCash)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">− Retiros</span>
              <span className="tnum text-text">{formatCOP(vals.ret_real)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">− Préstamos en efectivo</span>
              <span className="tnum text-text">{formatCOP(prestamosEfectivoDia)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">− Compensado (al banco)</span>
              <span className="tnum text-text">{formatCOP(vals.compensado)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-text">Esperado en caja</span>
              <span className="tnum font-medium text-text">{formatCOP(esperadoCaja)}</span>
            </div>
          </div>

          {/* Diferencia destacada: que se note de una si la caja cuadra o no. */}
          <div
            className={cn(
              "mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[1rem] border px-4 py-3.5 transition-colors",
              cajaCuadra ? "border-success/35 bg-success-soft" : "border-danger/50 bg-danger-soft",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  cajaCuadra ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
                )}
              >
                {cajaCuadra ? (
                  <CheckCircle size={20} weight="fill" />
                ) : (
                  <Warning size={20} weight="fill" />
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p
                  className={cn(
                    "text-[0.92rem] font-semibold",
                    cajaCuadra ? "text-success" : "text-danger",
                  )}
                >
                  {cajaCuadra
                    ? "Caja cuadrada"
                    : diferenciaCaja > 0
                      ? "Sobra efectivo en caja"
                      : "Falta efectivo en caja"}
                </p>
                <p className="text-[0.72rem] text-muted">
                  {cajaCuadra
                    ? "Lo contado coincide con lo esperado."
                    : "Revisa el efectivo contado o los movimientos."}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "tnum shrink-0 text-lg font-bold tracking-tight sm:text-xl",
                cajaCuadra ? "text-success" : "text-danger",
              )}
            >
              {diferenciaCaja > 0 ? "+" : ""}
              {formatCOP(diferenciaCaja)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="nota">Nota (opcional)</Label>
          <Textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Observación del día…"
          />
        </div>
        </fieldset>
      </Card>

      {/* ====== Columna de resultado ====== */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <SaldoHero saldo={saldo} descuadre={descuadre} estado={estado} sinEmpezar={sinEmpezar} />

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
          </div>

          {/* La resta completa: sin esto había que hacer la cuenta de cabeza para
              conectar la lista con el saldo de arriba. */}
          <Separator className="mt-3 bg-line" />
          <div className="flex flex-col divide-y divide-line pt-1">
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">Total tirilla</span>
              <span className="tnum text-text">{formatCOP(vals.total_tirilla)}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">− Suma componentes</span>
              <span className="tnum text-text">{formatCOP(suma)}</span>
            </div>
          </div>
          <Separator className="mt-1 bg-line-strong data-[orientation=horizontal]:h-[1.5px]" />
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-[0.85rem] font-semibold text-text">Saldo final</span>
            <span
              className={cn(
                "tnum text-[0.95rem] font-bold tracking-tight",
                sinEmpezar ? "text-faint" : descuadre ? "text-danger" : "text-success",
              )}
            >
              {sinEmpezar ? "—" : formatCOP(saldo)}
            </span>
          </div>
        </Card>

        {/* Estado + guardar */}
        <Card className="flex flex-col gap-3 p-5">
          {locked ? (
            <Alert variant="muted">
              <Lock weight="fill" />
              <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo.</AlertTitle>
            </Alert>
          ) : (
            <>
              <Tabs value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
                <TabsList className="w-full">
                  <TabsTrigger value="abierto">
                    <LockOpen />
                    Abierto
                  </TabsTrigger>
                  <TabsTrigger value="cerrado">
                    <Lock />
                    Cerrado
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
        </Card>
      </div>

      <ConfirmDialog
        open={confirmarCierre}
        titulo="El día no cuadra. ¿Cerrarlo así?"
        detalle={`Hoy ${motivoDescuadre}. Después solo Juan podrá reabrirlo. Tu nota queda guardada como explicación.`}
        confirmar="Sí, cerrar así"
        onConfirmar={() => guardar("cerrado")}
        onCancelar={() => setConfirmarCierre(false)}
      />

      <CelebracionCierre play={celebrar} nombre={nombre} cuadrado={!descuadre} />
    </div>
  );
}

function Campo({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SaldoHero({
  saldo,
  descuadre,
  estado,
  sinEmpezar,
}: {
  saldo: number;
  descuadre: boolean;
  estado: EstadoCuadre;
  /** Sin tirilla escrita: el saldo aún no significa nada, no es un descuadre. */
  sinEmpezar: boolean;
}) {
  const faltan = saldo > 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-6 transition-colors",
        sinEmpezar ? "border-line-strong" : descuadre ? "border-danger/40" : "border-success/40",
      )}
    >
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Saldo final</p>
          <Badge variant={sinEmpezar ? "secondary" : descuadre ? "danger" : "success"}>
            {sinEmpezar ? (
              <Receipt size={12} weight="fill" />
            ) : descuadre ? (
              <Warning size={12} weight="fill" />
            ) : (
              <CheckCircle size={12} weight="fill" />
            )}
            {sinEmpezar ? "Sin tirilla" : descuadre ? "Descuadre" : "Cuadrado"}
          </Badge>
        </div>
        <div className="mt-3">
          {sinEmpezar ? (
            <p className="tnum text-4xl font-semibold tracking-tight text-faint">—</p>
          ) : (
            <SaldoVivo saldo={saldo} descuadre={descuadre} />
          )}
        </div>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">
          {sinEmpezar
            ? "Escribe el total de la tirilla para ver si el día cuadra."
            : descuadre
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
