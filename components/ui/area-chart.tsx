"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCOP, formatCompactCOP } from "@/lib/format";

export interface PuntoTendencia {
  /** Fecha ISO (yyyy-mm-dd). */
  fecha: string;
  valor: number;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1] ?? ""}`;
}

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
    <div className="rounded-card border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_-12px_oklch(0.4_0.07_258/0.35)]">
      <p className="text-[0.7rem] text-faint">{label ? etiquetaDia(label) : ""}</p>
      <p className="tnum mt-0.5 text-[0.85rem] font-semibold text-text">
        {formatCOP(v)} <span className="font-normal text-faint">{nombre}</span>
      </p>
    </div>
  );
}

/**
 * Tendencia de área (patrón shadcn/charts sobre Recharts) con los tokens de la
 * app: acento azul único, rejilla con --line, montos COP con .tnum.
 */
export function AreaTendencia({
  datos,
  nombre,
  height = 220,
}: {
  datos: PuntoTendencia[];
  /** Qué es el valor, para el tooltip ("en tirilla", "a favor de Luis"…). */
  nombre: string;
  height?: number;
}) {
  const gradId = useId();
  if (datos.length < 2) return null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="fecha"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            tickFormatter={etiquetaDia}
          />
          <YAxis
            width={58}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            tickFormatter={formatCompactCOP}
          />
          <Tooltip content={<TooltipCOP nombre={nombre} />} cursor={{ stroke: "var(--line-strong)" }} />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="var(--accent)"
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
