"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useNavegacion } from "@/lib/use-navegacion";
import Link from "next/link";
import { toast } from "sonner";
import {
  FloppyDisk,
  Wallet,
  Warning,
  CheckCircle,
  Lock,
  LockOpen,
  ArrowClockwise,
  Receipt,
  Money,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Bank,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Contador } from "@/components/ui/contador";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { TarjetaNavy, NavyRotulo, NavyFila, NavySeparador } from "@/components/ui/navy";
import { CelebracionCierre } from "@/components/fx/celebracion-cierre";
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
import { Plegable, usePlegadas } from "@/components/ui/plegable";
import { Deslizar } from "@/components/ui/deslizar";
import { FlechaFila } from "@/components/ui/flecha-fila";
import { fondoTono, tintaTono, type Tono } from "@/lib/tonos";

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
  soportesCount,
  movCount,
  prestamosCount,
  prestamosTransferDia,
  prestamosEfectivoDia,
  movTotales,
}: Props) {
  const router = useNavegacion();
  const [pending, startTransition] = useTransition();
  const [celebrar, setCelebrar] = useState(0);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  // Cada intento de cerrar que no sigue (falta algo, se canceló) devuelve el
  // círculo del deslizador a su sitio con una key nueva.
  const [intento, setIntento] = useState(0);
  // Lo que se recoge en el Cuadre se recuerda en este equipo (Biela).
  const [abierto, alternar] = usePlegadas("cuadre");

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
        setIntento((n) => n + 1);
        return;
      }
      if (descuadre || !cajaCuadra) {
        // Exige explicación escrita (queda para Juan) y confirmación antes de cerrar descuadrado.
        if (!nota.trim()) {
          toast.error("El día no cuadra. Escribe en la nota por qué, antes de cerrarlo.");
          setIntento((n) => n + 1);
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
        setIntento((n) => n + 1);
      }
    });
  }

  // Lo que falta para cerrar, dicho en el deslizador apagado (Biela: el rótulo
  // dice qué falta, no se queda gris y mudo).
  const faltaParaCerrar =
    sinEmpezar ? "Escribe la tirilla" : soportesCount === 0 ? "Adjunta la tirilla" : (descuadre || !cajaCuadra) && !nota.trim() ? "Escribe la nota" : "";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      {/* ====== Columna de captura: dos cajones que se recogen ====== */}
      <div className="flex min-w-0 flex-col gap-5">
        <Plegable
          titulo="Movimientos del día"
          icono={<Receipt size={18} className={tintaTono("purple")} />}
          cifra={abierto("movimientos") ? null : formatCOP(vals.total_tirilla)}
          abierto={abierto("movimientos")}
          onAbiertoChange={alternar("movimientos")}
          acciones={
            <>
              {estado === "cerrado" && (
                <Badge variant="success">
                  <Lock size={12} weight="fill" />
                  Cerrado
                </Badge>
              )}
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
            </>
          }
        >
          <div className="p-4 sm:p-5">
            {locked && (
              <Alert variant="muted" className="mb-4">
                <Lock weight="fill" />
                <AlertTitle className="line-clamp-none font-normal">Día cerrado. Solo Juan puede reabrirlo para editar.</AlertTitle>
              </Alert>
            )}

            <fieldset disabled={locked} className="contents">
              {/* Total tirilla: el primer campo y el grande. */}
              <Campo label="Total tirilla" id="total_tirilla">
                <MoneyInput id="total_tirilla" size="lg" value={vals.total_tirilla} onValueChange={set("total_tirilla")} />
              </Campo>

              {/* Sr. Luis (lectura): fila que lleva a su cuenta. */}
              <Item
                asChild
                className="mt-4 flex-nowrap gap-3 rounded-xl border-fila-borde bg-fila px-3 py-2.5 [a]:hover:bg-fila-hover"
              >
                <Link href="/luis">
                  <ItemMedia
                    variant="icon"
                    className={cn(
                      "group-has-[[data-slot=item-description]]/item:translate-y-0 group-has-[[data-slot=item-description]]/item:self-center",
                      fondoTono("purple"),
                    )}
                  >
                    <Wallet size={18} />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="text-body font-medium text-text">Sr. Luis</ItemTitle>
                    <ItemDescription className="truncate text-nowrap text-meta text-muted">
                      {consignacionesCount} {consignacionesCount === 1 ? "consignación" : "consignaciones"}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="shrink-0 gap-1.5">
                    <span className="tnum text-title font-medium text-text">{formatCOP(srLuis)}</span>
                    <FlechaFila />
                  </ItemActions>
                </Link>
              </Item>

              {(movCount > 0 || prestamosCount > 0) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" onClick={traerDeMovimientos} className="mt-4 w-full">
                      <ArrowClockwise size={16} weight="bold" />
                      Traer totales
                      <Contador n={movCount + prestamosCount} />
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
              <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
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
            </fieldset>
          </div>
        </Plegable>

        {/* Arqueo de caja física: su propio cajón, con lo esperado a la vista
            aunque esté recogido. */}
        <Plegable
          titulo="Arqueo de caja"
          icono={<Money size={18} className={tintaTono("ok")} />}
          cifra={abierto("arqueo") ? null : formatCOP(esperadoCaja)}
          abierto={abierto("arqueo")}
          onAbiertoChange={alternar("arqueo")}
        >
          <div className="p-4 sm:p-5">
            <fieldset disabled={locked} className="contents">
              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <Campo label="Fondo en caja" id="fondo_caja">
                  <MoneyInput id="fondo_caja" value={vals.fondo_caja} onValueChange={set("fondo_caja")} />
                </Campo>
                <Campo label="Efectivo contado" id="efectivo_contado">
                  <MoneyInput id="efectivo_contado" value={vals.efectivo_contado} onValueChange={set("efectivo_contado")} />
                </Campo>
              </div>
              <ul className="mt-3 flex list-none flex-col p-0 text-body">
                <FilaArqueo icono={ArrowDownLeft} tono="ok" rotulo="Entró por consignaciones" valor={consignacionesCash} signo="+ " />
                <FilaArqueo icono={ArrowUpRight} tono="bad" rotulo="Retiros" valor={vals.ret_real} signo="− " />
                <FilaArqueo icono={HandCoins} tono="warn" rotulo="Préstamos en efectivo" valor={prestamosEfectivoDia} signo="− " />
                <FilaArqueo icono={Bank} tono="warn" rotulo="Compensado al banco" valor={vals.compensado} signo="− " />
              </ul>
              <div className="mt-3 flex items-end justify-between gap-4 border-t border-line pt-3">
                <span className="text-body text-muted">Esperado en caja</span>
                <span className="tnum text-h1 leading-none font-medium tracking-[-0.6px] text-text">{formatCOP(esperadoCaja)}</span>
              </div>

              {/* La diferencia en el par de su estado: que se note de una si la
                  caja cuadra. */}
              <div
                className={cn(
                  "mt-4 rounded-2xl px-4 py-3.5 transition-colors duration-[var(--dur-2)]",
                  cajaCuadra ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg",
                )}
              >
                <p className="flex items-center gap-1.5 text-body font-medium">
                  {cajaCuadra ? <CheckCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
                  {cajaCuadra
                    ? "Caja cuadrada"
                    : diferenciaCaja > 0
                      ? "Sobra efectivo en caja"
                      : "Falta efectivo en caja"}
                </p>
                {!cajaCuadra && (
                  <p className="tnum mt-1.5 text-h1 leading-none font-medium tracking-[-0.6px]">
                    {diferenciaCaja > 0 ? "+" : ""}
                    {formatCOP(diferenciaCaja)}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-1.5">
                <Label htmlFor="nota">Nota</Label>
                <Textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder="Observación del día…"
                  aria-describedby="nota-ayuda"
                />
                <p id="nota-ayuda" className="text-meta text-muted">
                  Si el día no cuadra, explica aquí por qué antes de cerrarlo.
                </p>
              </div>
            </fieldset>
          </div>
        </Plegable>
      </div>

      {/* ====== Resultado: la tarjeta navy (la cifra sobre la que se guarda o se cierra) ====== */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <TarjetaNavy className="p-[22px]">
          <div className="flex items-center justify-between gap-3">
            <NavyRotulo>Saldo final</NavyRotulo>
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
          {!sinEmpezar && (
            <AnimatedMoney
              value={saldo}
              desdeCero={false}
              className="mt-3 block text-display leading-none font-medium tracking-[-0.8px] text-white"
            />
          )}
          <p className="mt-2.5 text-body leading-relaxed text-white/70">
            {sinEmpezar
              ? "Escribe el total de la tirilla para ver si el día cuadra."
              : descuadre
                ? saldo > 0
                  ? `Faltan ${formatCOP(saldo)} por registrar para que la tirilla cuadre.`
                  : `Sobran ${formatCOP(Math.abs(saldo))} sin justificar. Revisa los movimientos del día.`
                : estado === "cerrado"
                  ? "Día cerrado y cuadrado."
                  : "Todo cuadra. Puedes cerrar el día."}
          </p>

          <NavyRotulo className="mt-5 mb-1.5">Cómo cuadra</NavyRotulo>
          {lineas.map((l) => (
            <NavyFila key={l.label} rotulo={l.label} valor={formatCOP(l.value)} />
          ))}
          <NavySeparador className="my-1" />
          <NavyFila rotulo="Suma componentes" valor={formatCOP(suma)} fuerte />
          <NavyFila rotulo="Total tirilla" valor={formatCOP(vals.total_tirilla)} />
          <NavyFila rotulo="− Suma componentes" valor={formatCOP(suma)} />
          <NavySeparador className="my-1" />
          <NavyFila rotulo="Saldo final" valor={sinEmpezar ? "Sin tirilla" : formatCOP(saldo)} fuerte />

          <div className="mt-5 flex flex-col gap-2.5">
            {locked ? (
              <p className="flex items-center gap-2 text-body text-white/70">
                <Lock size={16} weight="fill" className="shrink-0" />
                Día cerrado. Solo Juan puede reabrirlo.
              </p>
            ) : estado !== "cerrado" ? (
              // Cerrar con un gesto (Biela, 8 nov 2026): el candado se desliza
              // hasta el final y guarda y cierra de una. Apagado, dice qué falta.
              // Con el teclado, Enter hace lo mismo. Si el día no cuadra, sale
              // la confirmación de siempre antes de cerrar.
              <Deslizar
                key={intento}
                texto="Cerrar día"
                apagado={!pending ? faltaParaCerrar : ""}
                onListo={() => onGuardar("cerrado")}
                onTeclado={() => onGuardar("cerrado")}
                cargando={pending}
                textoHecho="Día cerrado"
              />
            ) : (
              // Solo Juan llega aquí con el día cerrado: corrige o lo reabre.
              <>
                <Button onClick={() => onGuardar("cerrado")} cargando={pending} className="w-full">
                  {!pending && <FloppyDisk size={18} weight="fill" />}
                  {pending ? "Guardando…" : "Guardar cambios"}
                </Button>
                <Button variant="sobre-oscuro" onClick={() => onGuardar("abierto")} disabled={pending} className="w-full">
                  <LockOpen size={16} />
                  Reabrir día
                </Button>
              </>
            )}
          </div>
        </TarjetaNavy>
      </div>

      <ConfirmDialog
        open={confirmarCierre}
        titulo="El día no cuadra. ¿Cerrarlo así?"
        detalle={`${motivoDescuadre.charAt(0).toUpperCase()}${motivoDescuadre.slice(1)}. Tu nota queda guardada como explicación.${isAdmin ? "" : " Después solo Juan podrá reabrirlo."}`}
        confirmar="Cerrar así"
        tono="warn"
        onConfirmar={() => guardar("cerrado")}
        onCancelar={() => {
          setConfirmarCierre(false);
          setIntento((n) => n + 1);
        }}
      />

      <CelebracionCierre play={celebrar} fecha={fecha} cuadrado={!descuadre} />
    </div>
  );
}

function Campo({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Renglón del arqueo: ícono con el color de su tipo de plata, rótulo y cifra. */
function FilaArqueo({
  icono: Icono,
  tono,
  rotulo,
  valor,
  signo = "",
}: {
  icono: React.ElementType;
  tono: Tono;
  rotulo: string;
  valor: number;
  signo?: string;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-linea-fila py-2.5 last:border-0">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px]", fondoTono(tono))}>
        <Icono size={16} weight="bold" />
      </span>
      <span className="min-w-0 flex-1 text-text-2">{rotulo}</span>
      <span className="tnum text-text">
        {valor ? signo : ""}
        {formatCOP(valor)}
      </span>
    </li>
  );
}
