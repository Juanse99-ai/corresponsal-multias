"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis } from "recharts";
import {
  Calculator,
  Wallet,
  CaretRight,
  CheckCircle,
  Warning,
  HandCoins,
  Plus,
  TrendUp,
  ChartPie,
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { AnimatedMoney } from "@/components/ui/animated-number";
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
  srLuisHoy: number;
  consignacionesHoyCount: number;
  saldoLuisAcumulado: number;
  recientes: Reciente[];
  stats: { cuadrados: number; descuadres: number };
  deudas: { totalPendiente: number; personas: PersonaSaldo[] } | null;
}

/** Rótulo de tarjeta, como los resúmenes de Salud del iPhone: ícono de color y nombre. */
const TITULO = "flex items-center gap-2 text-[0.9rem] font-semibold tracking-tight text-text";
/** Nombre de la cifra, encima del número. */
const ROTULO = "text-[0.82rem] text-muted";
/** Tarjeta que abre otra pantalla. */
const TARJETA_LINK = "flex h-full flex-col transition-colors hover:border-line-strong";

function Chevron() {
  return <CaretRight size={15} weight="bold" className="text-faint transition-transform group-hover:translate-x-0.5" />;
}

export function PanelView({ data }: { data: PanelData }) {
  const primer = data.nombre.split(/\s+/)[0];
  // Sin tirilla escrita el saldo todavía no significa nada: no se pinta rojo.
  const sinTirilla = !!data.cuadreHoy && data.tirillaHoy === 0;
  const descuadreHoy = !!data.cuadreHoy && !sinTirilla && Math.round(data.cuadreHoy.saldo_final) !== 0;
  const pendientes = data.deudas?.personas.filter((p) => p.saldo > 0) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.7rem]">
          {data.saludo}, {primer}
        </h1>
        <p className="mt-1 text-sm text-muted">{data.mensaje}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        <Link href="/cuadre" className="group block">
          <Card
            className={cn(
              TARJETA_LINK,
              data.cuadreHoy && !sinTirilla && (descuadreHoy ? "border-danger/40" : "border-success/40"),
            )}
          >
            <CardHeader className="items-center pb-2">
              <CardTitle className={TITULO}>
                <Calculator size={18} weight="fill" className="text-accent" />
                Cuadre de hoy
              </CardTitle>
              <CardAction className="flex items-center gap-2 self-center">
                {!data.cuadreHoy ? (
                  <Badge variant="secondary">Sin abrir</Badge>
                ) : sinTirilla ? (
                  <Badge variant="secondary">Sin tirilla</Badge>
                ) : (
                  <Badge variant={descuadreHoy ? "danger" : "success"}>
                    {descuadreHoy ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                    {descuadreHoy ? "Descuadre" : "Cuadrado"}
                  </Badge>
                )}
                <Chevron />
              </CardAction>
            </CardHeader>

            <CardContent>
              {!data.cuadreHoy ? (
                <p className="text-[0.95rem] text-muted">Ábrelo cuando tengas la tirilla.</p>
              ) : sinTirilla ? (
                <p className="text-[0.95rem] text-muted">Escribe el total de la tirilla para ver si el día cuadra.</p>
              ) : (
                <>
                  <p className={ROTULO}>Saldo final</p>
                  <p
                    className={cn(
                      "tnum mt-0.5 text-4xl font-semibold tracking-tight",
                      descuadreHoy ? "text-danger" : "text-success",
                    )}
                  >
                    <AnimatedMoney value={data.cuadreHoy.saldo_final} />
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/luis" className="group block">
          <Card className={TARJETA_LINK}>
            <CardHeader className="items-center pb-2">
              <CardTitle className={TITULO}>
                <Wallet size={18} weight="fill" className="text-accent" />
                Sr. Luis
              </CardTitle>
              <CardAction className="self-center">
                <Chevron />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className={ROTULO}>Consignado hoy</p>
              <p className="tnum mt-0.5 text-3xl font-semibold tracking-tight text-text">
                <AnimatedMoney value={data.srLuisHoy} />
              </p>
              <p className="mt-1 text-[0.82rem] text-muted">
                {data.consignacionesHoyCount}{" "}
                {data.consignacionesHoyCount === 1 ? "consignación" : "consignaciones"}
              </p>
              <div className="mt-auto pt-4">
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-[0.85rem]">
                  <span className="text-muted">Saldo del Sr. Luis</span>
                  <span className="tnum font-medium text-text">{formatCOP(data.saldoLuisAcumulado)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <DistribucionCard distribucion={data.distribucion} tirilla={data.tirillaHoy} />

        {data.deudas ? (
          <Link href="/prestamos" className="group block">
            <Card className={TARJETA_LINK}>
              <CardHeader className="items-center pb-2">
                <CardTitle className={TITULO}>
                  <HandCoins size={18} weight="fill" className="text-accent" />
                  Préstamos
                </CardTitle>
                <CardAction className="self-center">
                  <Chevron />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className={ROTULO}>Total pendiente</p>
                <p className="tnum mt-0.5 text-3xl font-semibold tracking-tight text-text">
                  <AnimatedMoney value={data.deudas.totalPendiente} />
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {pendientes.slice(0, 4).map((p) => (
                    <div key={p.persona} className="flex items-center justify-between gap-3 text-[0.85rem]">
                      <span className="truncate text-muted">{p.persona}</span>
                      <span className="tnum shrink-0 text-text">{formatCOP(p.saldo)}</span>
                    </div>
                  ))}
                  {pendientes.length === 0 && <p className="text-[0.85rem] text-success">Nadie le debe al fondo.</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/prestamos" className="group block">
            <Card className={TARJETA_LINK}>
              <CardHeader className="items-center pb-2">
                <CardTitle className={TITULO}>
                  <HandCoins size={18} weight="fill" className="text-accent" />
                  Préstamos
                </CardTitle>
                <CardAction className="self-center">
                  <Chevron />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="flex items-center gap-1.5 text-[0.95rem] font-medium text-accent-strong">
                  <Plus size={15} weight="bold" />
                  Registrar un préstamo
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="items-center pb-2">
          <CardTitle className={TITULO}>
            <TrendUp size={18} weight="fill" className="text-accent" />
            Últimos cierres
          </CardTitle>
          {data.recientes.length > 0 && (
            <CardAction className="flex items-center gap-3 self-center text-[0.78rem] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" aria-hidden />
                {data.stats.cuadrados} {data.stats.cuadrados === 1 ? "cuadrado" : "cuadrados"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger" aria-hidden />
                {data.stats.descuadres} con descuadre
              </span>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {data.recientes.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay cierres registrados.</p>
          ) : (
            <RecientesChart recientes={data.recientes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DistribucionCard({ distribucion, tirilla }: { distribucion: { label: string; value: number }[]; tirilla: number }) {
  const reducir = useReducedMotion();
  // Rampa de un solo tono (el azul de la casa): la torta muestra composición, no
  // estado. El rojo y el verde quedan solo para cuadrado y descuadre.
  const SEG: Record<string, string> = {
    "Sr. Luis": "oklch(0.4 0.19 258)",
    Nequis: "oklch(0.62 0.14 258)",
    Bancolombia: "oklch(0.72 0.1 258)",
    "Préstamos": "oklch(0.8 0.06 258)",
    Compensado: "oklch(0.62 0.04 258)",
    Retiros: "oklch(0.5 0.03 258)",
  };
  const activos = distribucion.filter((s) => s.value > 0);
  const total = activos.reduce((a, b) => a + b.value, 0);

  const colorDe = (label: string) => SEG[label] ?? "oklch(0.6 0.05 258)";
  // Torta de shadcn (ChartContainer + recharts PieChart). Sin montos, un aro gris.
  const porcion = total > 0
    ? activos.map((s) => ({ label: s.label, value: s.value, fill: colorDe(s.label) }))
    : [{ label: "vacío", value: 1, fill: "var(--surface-2)" }];
  const legend: { label: string; pct: string; color: string }[] = total > 0
    ? activos.map((s) => ({ label: s.label, pct: `${Math.round((s.value / total) * 100)}%`, color: colorDe(s.label) }))
    : distribucion.slice(0, 5).map((s) => ({ label: s.label, pct: "0%", color: "var(--line)" }));
  const configTorta = Object.fromEntries(
    activos.map((s) => [s.label, { label: s.label, color: colorDe(s.label) }]),
  ) satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className={TITULO}>
          <ChartPie size={18} weight="fill" className="text-accent" />
          Distribución del día
        </CardTitle>
      </CardHeader>
      <CardContent>
      {distribucion.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          <div className="h-24 w-24 rounded-full border-[11px] border-line" />
          <p className="text-[0.82rem] text-muted">Abre el cuadre de hoy para ver la distribución.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <ChartContainer config={configTorta} className="aspect-square h-full w-full">
              <PieChart>
                {total > 0 && (
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" formatter={(v, n) => `${n}: ${formatCOP(Number(v))}`} />}
                  />
                )}
                <Pie
                  data={porcion}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={46}
                  outerRadius={64}
                  strokeWidth={0}
                  isAnimationActive={!reducir}
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-[18px] flex flex-col items-center justify-center rounded-full">
              <span className="text-[0.68rem] text-muted">Tirilla</span>
              <span className="tnum text-sm font-semibold text-text">{formatCompactCOP(tirilla)}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-[0.78rem]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: l.color }} />
                <span className="min-w-0 flex-1 truncate text-muted">{l.label}</span>
                <span className="tnum shrink-0 font-medium text-text">{l.pct}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  cuadrado: { label: "Cuadrado", color: "var(--success)" },
  descuadre: { label: "Descuadre", color: "var(--danger)" },
} satisfies ChartConfig;

/** Tooltip del gráfico: fecha corta y total de la tirilla (lo que antes iba en el title). */
function TooltipCierre({ active, payload }: { active?: boolean; payload?: { payload?: Reciente }[] }) {
  const r = payload?.[0]?.payload;
  if (!active || !r) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-[0.7rem] text-faint">{formatFechaCorta(r.fecha)}</p>
      <p className="tnum mt-0.5 text-[0.85rem] font-semibold">{formatCOP(r.total_tirilla)}</p>
    </div>
  );
}

function RecientesChart({ recientes }: { recientes: Reciente[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const orden = [...recientes].reverse(); // antiguo -> reciente

  return (
    <div>
      <ChartContainer config={chartConfig} className="aspect-auto h-28 w-full">
        <BarChart data={orden} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={3}>
          <XAxis dataKey="fecha" hide />
          <ChartTooltip content={<TooltipCierre />} cursor={false} />
          <Bar
            dataKey="total_tirilla"
            radius={6}
            // Alto mínimo visible (antes 8 %) aunque la tirilla sea pequeña.
            minPointSize={9}
            isAnimationActive={!reduce}
            animationDuration={600}
            className="cursor-pointer"
            onClick={(d: { payload?: Reciente }) => {
              if (d.payload) router.push(`/cuadre?fecha=${d.payload.fecha}`);
            }}
          >
            {orden.map((r) => {
              const descuadre = Math.round(r.saldo_final) !== 0;
              return (
                <Cell
                  key={r.fecha}
                  fill={descuadre ? "var(--color-descuadre)" : "var(--color-cuadrado)"}
                  fillOpacity={descuadre ? 0.7 : 0.6}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-2 flex justify-between text-[0.66rem] text-faint">
        <span>{formatFechaCorta(orden[0].fecha)}</span>
        <span>{formatFechaCorta(orden[orden.length - 1].fecha)}</span>
      </div>
    </div>
  );
}
