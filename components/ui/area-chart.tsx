"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatCOP, formatCompactCOP } from "@/lib/format";

export interface PuntoTendencia {
  fecha: string;
  valor: number;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1] ?? ""}`;
}

/** Tooltip en pesos: fecha corta arriba y el valor con su nombre. */
function TooltipCOP({
  active,
  payload,
  label,
  nombre,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  nombre: string;
}) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    // Globo oscuro del taller: fecha y la cifra con su nombre.
    <div className="globo-grafica min-w-[132px] rounded-lg px-[11px] py-2 text-meta text-white">
      <p className="text-white/82">{label ? etiquetaDia(label) : ""}</p>
      <p className="tnum mt-0.5 flex items-center gap-1.5 font-semibold">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
        {formatCOP(v)} <span className="font-normal text-white/82">{nombre}</span>
      </p>
    </div>
  );
}

/** Tendencia diaria en pesos con el <ChartContainer> de shadcn (recharts). */
export function AreaTendencia({
  datos,
  nombre,
  height = 220,
}: {
  datos: PuntoTendencia[];
  nombre: string;
  height?: number;
}) {
  const gradId = useId().replace(/:/g, "");
  // La línea se dibuja al entrar (600 ms); con reducir movimiento sale entera.
  const reducir = useReducedMotion();
  if (datos.length < 2) return null;

  const config = { valor: { label: nombre, color: "var(--accent)" } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-valor)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-valor)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--linea-fila)" />
        <XAxis
          dataKey="fecha"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={etiquetaDia}
        />
        <YAxis width={58} tickLine={false} axisLine={false} tickFormatter={formatCompactCOP} />
        <ChartTooltip
          content={<TooltipCOP nombre={nombre} />}
          cursor={{ stroke: "color-mix(in oklch, var(--text) 40%, transparent)", strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--color-valor)"
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 3.5, fill: "var(--color-valor)", stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={!reducir}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  );
}
