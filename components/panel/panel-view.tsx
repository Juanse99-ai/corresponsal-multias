"use client";

import { useId, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useInView, useReducedMotion } from "framer-motion";
import { Bar, Cell, ComposedChart, LabelList, Line, XAxis, YAxis } from "recharts";
import {
  CaretRight,
  CaretDown,
  CaretUp,
  CheckCircle,
  Warning,
  Plus,
  ArrowRight,
  Wallet,
  HandCoins,
  ChartBar,
  CalendarCheck,
  CircleDashed,
  Receipt,
  ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardIcono, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Celdas, Celda } from "@/components/ui/celdas";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { TarjetaNavy, NavyRotulo } from "@/components/ui/navy";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { PageHeader } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";
import { formatCOP, formatCompactCOP, formatFechaCorta } from "@/lib/format";
import type { Rol } from "@/lib/cuadre";
import type { PersonaSaldo } from "@/lib/queries";

interface Reciente {
  fecha: string;
  saldo_final: number;
  total_tirilla: number;
  estado: string;
}

export interface PanelData {
  nombre: string;
  saludo: string;
  /** Línea bajo el saludo: el mensaje personal si la persona tiene uno, si no la fecha. */
  mensaje: string;
  rol: Rol;
  cuadreHoy: { estado: string; saldo_final: number } | null;
  tirillaHoy: number;
  distribucion: { label: string; value: number }[];
  /** El mismo reparto del día anterior (vacío si ayer no hubo cuadre). */
  distribucionAyer: { label: string; value: number }[];
  srLuisHoy: number;
  consignacionesHoyCount: number;
  saldoLuisAcumulado: number;
  recientes: Reciente[];
  stats: { cuadrados: number; descuadres: number };
  deudas: { totalPendiente: number; personas: PersonaSaldo[] } | null;
}

/** Tarjeta que abre otra pantalla: toda la tarjeta es el enlace. */
const TARJETA_LINK = "flex h-full flex-col transition-colors duration-[var(--dur-1)] hover:border-line-strong";

function Chevron() {
  return <CaretRight size={15} weight="bold" className="text-inerte transition-transform group-hover:translate-x-0.5" />;
}

export function PanelView({ data }: { data: PanelData }) {
  const primer = data.nombre.split(/\s+/)[0];
  // Sin tirilla escrita el saldo todavía no significa nada: no se pinta rojo.
  const sinTirilla = !!data.cuadreHoy && data.tirillaHoy === 0;
  const descuadreHoy = !!data.cuadreHoy && !sinTirilla && Math.round(data.cuadreHoy.saldo_final) !== 0;
  const pendientes = data.deudas?.personas.filter((p) => p.saldo > 0) ?? [];

  return (
    <div>
      <PageHeader title={`${data.saludo}, ${primer}`} subtitle={data.mensaje} />

      <div className="flex flex-col gap-4 lg:gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        {/* La tarjeta navy de la pantalla: la cifra del día sobre la que se actúa. */}
        <TarjetaNavy className="h-full p-[22px]">
          <div className="flex items-center justify-between gap-3">
            <NavyRotulo>Cuadre de hoy</NavyRotulo>
            {!data.cuadreHoy ? (
              <Badge variant="secondary">
                <CircleDashed weight="bold" />
                Pendiente
              </Badge>
            ) : sinTirilla ? (
              <Badge variant="secondary">
                <Receipt weight="fill" />
                Pendiente
              </Badge>
            ) : (
              <Badge variant={descuadreHoy ? "danger" : "success"}>
                {descuadreHoy ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                {descuadreHoy ? "Descuadre" : "Cuadrado"}
              </Badge>
            )}
          </div>
          {data.cuadreHoy && !sinTirilla && (
            <>
              <AnimatedMoney
                value={data.cuadreHoy.saldo_final}
                className="mt-3 block text-display leading-none font-semibold tracking-[-0.8px] text-white"
              />
              <p className="mt-1.5 text-body text-white/70">Saldo final</p>
            </>
          )}
          <p className={cn("text-body text-white/70", data.cuadreHoy && !sinTirilla ? "mt-1" : "mt-3")}>
            {!data.cuadreHoy
              ? "Sin abrir"
              : sinTirilla
                ? "Falta la tirilla"
                : descuadreHoy
                  ? data.cuadreHoy.saldo_final > 0
                    ? `Faltan ${formatCOP(data.cuadreHoy.saldo_final)} por registrar`
                    : `Sobran ${formatCOP(Math.abs(data.cuadreHoy.saldo_final))} sin justificar`
                  : data.cuadreHoy.estado === "cerrado"
                    ? "Día cerrado"
                    : "Listo para cerrar"}
          </p>
          <div className="mt-auto pt-5">
            <Button asChild className="w-full">
              <Link href="/cuadre">
                {data.cuadreHoy ? "Ir al cuadre" : "Abrir cuadre"}
                <ArrowRight weight="bold" />
              </Link>
            </Button>
          </div>
        </TarjetaNavy>

        <Link href="/luis" className="group block rounded-3xl">
          <Card className={TARJETA_LINK}>
            <CardHeader className="items-center">
              <CardTitle icono={<Wallet weight="fill" />}>Sr. Luis</CardTitle>
              <CardAction className="self-center">
                <Chevron />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Celdas>
                <Celda
                  rotulo="Consignado hoy"
                  grande
                  detalle={`${data.consignacionesHoyCount} ${data.consignacionesHoyCount === 1 ? "consignación" : "consignaciones"}`}
                >
                  <AnimatedMoney value={data.srLuisHoy} />
                </Celda>
                <Celda rotulo="Saldo del Sr. Luis" grande>
                  <AnimatedMoney value={data.saldoLuisAcumulado} />
                </Celda>
              </Celdas>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {/* En el celular Préstamos va antes que la torta; en el computador, a la derecha. */}
        <Link href="/prestamos" className="group block rounded-3xl lg:order-last">
          <Card className={TARJETA_LINK}>
            <CardHeader className="items-center">
              <CardTitle icono={<HandCoins weight="fill" />}>Préstamos</CardTitle>
              <CardAction className="self-center">
                <Chevron />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {data.deudas ? (
                <>
                  <p className="text-meta font-medium text-faint">Total pendiente</p>
                  <AnimatedMoney
                    value={data.deudas.totalPendiente}
                    className="mt-1 block text-kpi leading-none font-semibold tracking-[-0.6px] text-text"
                  />
                  {pendientes.length === 0 ? (
                    <Empty fila className="mt-2">
                      <EmptyTitle>Sin deudas</EmptyTitle>
                    </Empty>
                  ) : (
                    <ItemGroup variant="cajitas" className="mt-4">
                      {pendientes.slice(0, 4).map((p, i) => (
                        <div key={p.persona} className="contents">
                          {i > 0 && <ItemSeparator />}
                          <Item size="sm" className="flex-nowrap px-0 py-2 lg:px-3">
                            <ItemContent className="min-w-0">
                              <ItemTitle className="truncate text-body font-medium">{p.persona}</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                              <span className="tnum text-title font-semibold text-text">{formatCOP(p.saldo)}</span>
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  )}
                </>
              ) : (
                <Item size="sm" className="flex-nowrap gap-3 px-0 py-1">
                  <ItemMedia variant="icon">
                    <Plus weight="bold" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-body font-semibold">Registrar</ItemTitle>
                  </ItemContent>
                </Item>
              )}
            </CardContent>
          </Card>
        </Link>

        <DistribucionCard distribucion={data.distribucion} distribucionAyer={data.distribucionAyer} tirilla={data.tirillaHoy} />
      </div>

      <CierresCard recientes={data.recientes} stats={data.stats} />
      </div>
    </div>
  );
}

/** Lo que va en una barra: el nombre corto bajo la barra. */
const CORTO: Record<string, string> = {
  "Sr. Luis": "Sr. Luis",
  Nequis: "Nequis",
  Bancolombia: "Bancol.",
  "Préstamos": "Prést.",
  Compensado: "Comp.",
  Retiros: "Retiros",
};

const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

/**
 * Distribución del día como en la referencia: barras rayadas con el porcentaje
 * encima, la más grande en carbón, y una línea naranja con el reparto de ayer
 * para comparar. Es composición, no estado: sin verde ni rojo.
 */
function DistribucionCard({
  distribucion,
  distribucionAyer,
  tirilla,
}: {
  distribucion: { label: string; value: number }[];
  distribucionAyer: { label: string; value: number }[];
  tirilla: number;
}) {
  const reducir = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const total = distribucion.reduce((a, b) => a + Math.max(0, b.value), 0);
  const totalAyer = distribucionAyer.reduce((a, b) => a + Math.max(0, b.value), 0);
  const ayerDe = (label: string) => distribucionAyer.find((d) => d.label === label)?.value ?? 0;
  const filas = distribucion
    .filter((s) => s.value > 0 || ayerDe(s.label) > 0)
    .map((s) => ({
      label: s.label,
      corto: CORTO[s.label] ?? s.label,
      valor: Math.max(0, s.value),
      hoy: pct(Math.max(0, s.value), total),
      ayer: totalAyer > 0 ? pct(ayerDe(s.label), totalAyer) : null,
    }));
  const mayor = filas.reduce((m, f) => Math.max(m, f.hoy), 0);
  const tope = Math.max(mayor, ...filas.map((f) => f.ayer ?? 0), 10);
  const hayAyer = totalAyer > 0;
  const config = {
    hoy: { label: "Hoy", color: "var(--color-raya-claro)" },
    ayer: { label: "Ayer", color: "var(--color-naranja)" },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader className="items-center">
        <CardTitle icono={<ChartBar weight="fill" />}>Distribución del día</CardTitle>
        {total > 0 && (
          <CardAction className="self-center">
            <span className="tnum text-meta text-faint">Tirilla {formatCompactCOP(tirilla)}</span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <Empty fila>
            <EmptyTitle>Sin cuadre hoy</EmptyTitle>
          </Empty>
        ) : (
          <>
            <div className="rounded-2xl bg-surface-2/70 px-2 pt-3 pb-1">
              <ChartContainer config={config} className="aspect-auto h-44 w-full">
                <ComposedChart data={filas} margin={{ top: 22, right: 10, bottom: 0, left: 10 }} barCategoryGap="22%">
                  <defs>
                    <pattern id={`${id}-claro`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="7" height="7" fill="var(--color-raya-claro)" />
                      <rect width="2.6" height="7" fill="var(--color-raya-claro-2)" />
                    </pattern>
                    <pattern id={`${id}-oscuro`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="7" height="7" fill="var(--color-raya-oscuro)" />
                      <rect width="2.6" height="7" fill="var(--color-raya-oscuro-2)" />
                    </pattern>
                  </defs>
                  <XAxis dataKey="corto" tickLine={false} axisLine={false} tickMargin={6} interval={0} />
                  <YAxis hide domain={[0, tope * 1.18]} />
                  <ChartTooltip cursor={false} content={<TooltipDistribucion />} />
                  <Bar dataKey="hoy" radius={[9, 9, 4, 4]} isAnimationActive={!reducir}>
                    {filas.map((f) => (
                      <Cell key={f.label} fill={`url(#${id}-${f.hoy === mayor ? "oscuro" : "claro"})`} />
                    ))}
                    <LabelList
                      dataKey="hoy"
                      position="top"
                      offset={7}
                      formatter={(v: unknown) => `${v}%`}
                      className="tnum fill-text text-meta font-medium"
                    />
                  </Bar>
                  {hayAyer && (
                    <Line
                      dataKey="ayer"
                      type="linear"
                      stroke="var(--color-naranja)"
                      strokeWidth={2}
                      dot={{ r: 4.5, fill: "var(--color-naranja)", strokeWidth: 0 }}
                      activeDot={{ r: 5.5, fill: "var(--color-naranja)", strokeWidth: 0 }}
                      connectNulls
                      isAnimationActive={!reducir}
                    />
                  )}
                </ComposedChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-meta text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[3px] bg-raya-oscuro" />
                Hoy
              </span>
              {hayAyer ? (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="h-0.5 w-3.5 rounded-full bg-naranja" />
                  Ayer
                </span>
              ) : (
                <span>Ayer sin cuadre</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Globo oscuro de la distribución: el concepto, lo de hoy en plata y el % de ayer. */
function TooltipDistribucion({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { label: string; valor: number; hoy: number; ayer: number | null } }[];
}) {
  const f = payload?.[0]?.payload;
  if (!active || !f) return null;
  return (
    <div className="globo-grafica min-w-[132px] rounded-lg px-[11px] py-2 text-meta text-white">
      <p className="text-white/82">{f.label}</p>
      <p className="tnum mt-0.5 font-semibold">
        {formatCOP(f.valor)}, {f.hoy}%
      </p>
      {f.ayer !== null && <p className="tnum text-white/82">Ayer {f.ayer}%</p>}
    </div>
  );
}

/** Filas de cuadritos de la cuadrícula de cierres. */
const FILAS = 6;

/**
 * Últimos cierres en cuadritos, como la tarjeta de rendimiento de la
 * referencia: cada columna es un día (el más viejo a la izquierda), con tantos
 * cuadritos llenos como la tirilla de ese día frente a la mayor. Lleno en
 * carbón si cuadró, en rojo si no. Encima, la tirilla del último día frente
 * al promedio de los anteriores. Cada columna abre el cuadre de su día.
 */
function CierresCard({ recientes, stats }: { recientes: Reciente[]; stats: PanelData["stats"] }) {
  const orden = [...recientes].reverse(); // antiguo -> reciente
  const caja = useRef<HTMLDivElement>(null);
  const vista = useInView(caja, { once: true, amount: 0.4 });
  const max = orden.reduce((m, r) => Math.max(m, r.total_tirilla), 0);
  const alto = (t: number) => (max > 0 ? Math.min(FILAS, Math.max(1, Math.round((t / max) * FILAS))) : 1);

  const ultimo = orden[orden.length - 1];
  const previos = orden.slice(0, -1);
  const promedio = previos.length ? previos.reduce((s, r) => s + r.total_tirilla, 0) / previos.length : 0;
  const cambio = ultimo && promedio > 0 ? ((ultimo.total_tirilla - promedio) / promedio) * 100 : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-stretch gap-4 sm:gap-6">
        <div className="flex min-w-0 shrink-0 flex-col sm:w-48">
          <div className="flex items-center gap-2.5">
            <CardIcono>
              <CalendarCheck weight="fill" />
            </CardIcono>
            <p className="min-w-0 truncate text-lead font-medium tracking-[-0.3px] text-text">Últimos cierres</p>
          </div>
          <p className="mt-2 text-meta text-muted">
            {recientes.length === 0
              ? "Sin cierres"
              : `${stats.cuadrados} de ${recientes.length} ${recientes.length === 1 ? "cuadró" : "cuadraron"}`}
          </p>
          {stats.descuadres > 0 && (
            <p className="mt-0.5 flex items-center gap-1.5 text-meta text-muted">
              <span aria-hidden className="size-2 rounded-[2px] bg-danger" />
              {stats.descuadres} con descuadre
            </p>
          )}
          <div className="mt-auto pt-4">
            {/* El botón negro de la referencia ("Check now"): ícono y una palabra. */}
            <Button asChild size="sm">
              <Link href="/historial">
                <ClockCounterClockwise weight="bold" />
                Historial
              </Link>
            </Button>
          </div>
        </div>

        {orden.length > 0 && (
          // Cuadritos de 22 px como máximo (32 en el computador): la cuadrícula
          // no se estira a todo el ancho, se queda a la derecha.
          <div
            ref={caja}
            className="relative ml-auto max-w-[calc(var(--cols)*25px)] min-w-0 flex-1 pt-8 lg:max-w-[calc(var(--cols)*35px)]"
            style={{ "--cols": orden.length } as CSSProperties}
          >
            {cambio !== null && (
              <span
                className="tnum absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blanco px-2.5 py-1 text-meta font-semibold text-text shadow-pastilla"
                title="Tirilla del último día frente al promedio de los anteriores"
              >
                {cambio >= 0 ? <CaretUp size={11} weight="fill" /> : <CaretDown size={11} weight="fill" />}
                {cambio >= 0 ? "+" : "−"}
                {Math.abs(cambio).toFixed(1).replace(".", ",")}%
              </span>
            )}
            <div
              className="grid h-full items-end gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${orden.length}, minmax(0, 1fr))` }}
            >
              {orden.map((r, i) => {
                const h = alto(r.total_tirilla);
                const descuadre = Math.round(r.saldo_final) !== 0;
                return (
                  <Tooltip key={r.fecha}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/cuadre?fecha=${r.fecha}`}
                        aria-label={`${formatFechaCorta(r.fecha)}: ${formatCOP(r.total_tirilla)}${descuadre ? ", con descuadre" : ""}`}
                        className="group/col flex flex-col gap-[3px] rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Array.from({ length: FILAS - h }, (_, k) => (
                          <span
                            key={k}
                            aria-hidden
                            className={cn(
                              "aspect-square w-full rounded-[3px]",
                              k === FILAS - h - 1 ? "bg-line-strong" : "bg-elevated",
                            )}
                          />
                        ))}
                        <span
                          aria-hidden
                          className={cn("flex flex-col gap-[3px]", vista ? "barra-crece" : "barra-espera")}
                          style={{ "--m": i } as CSSProperties}
                        >
                          {Array.from({ length: h }, (_, k) => (
                            <span
                              key={k}
                              className={cn(
                                "aspect-square w-full rounded-[3px] transition-opacity group-hover/col:opacity-80",
                                descuadre ? "bg-danger" : "bg-text",
                              )}
                            />
                          ))}
                        </span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatFechaCorta(r.fecha)}: {formatCOP(r.total_tirilla)}
                      {descuadre ? ", descuadre" : ""}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
