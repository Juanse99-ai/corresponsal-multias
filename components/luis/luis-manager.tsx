"use client";

import { Wallet, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import type { ConsignacionLuisRow, CompensacionLuisRow } from "@/lib/database.types";
import { MovimientosSection } from "@/components/luis/movimientos-section";
import { ReporteLuisButton } from "@/components/luis/reporte-luis";
import {
  agregarConsignacion,
  eliminarConsignacion,
  editarConsignacion,
  agregarCompensacion,
  eliminarCompensacion,
  editarCompensacion,
} from "@/app/(app)/luis/actions";

export function LuisManager({
  fecha,
  acumuladoAyer,
  consignaciones,
  compensaciones,
}: {
  fecha: string;
  acumuladoAyer: number;
  consignaciones: ConsignacionLuisRow[];
  compensaciones: CompensacionLuisRow[];
}) {
  const totalConsig = consignaciones.reduce((s, c) => s + c.monto, 0);
  const totalComp = compensaciones.reduce((s, c) => s + c.monto, 0);
  const saldoDia = totalComp - totalConsig;
  const acumulado = acumuladoAyer + saldoDia;

  const favor = (n: number) => (n > 0 ? "A favor de Luis" : n < 0 ? "A favor del punto" : "Igualado");

  return (
    <div className="flex flex-col gap-5">
      {/* Saldo acumulado de Luis (su dinero) */}
      <Card className="relative overflow-hidden border-accent/25 p-6">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-faint">
              <Wallet size={15} weight="fill" className="text-accent" />
              <span className="text-[0.72rem] uppercase tracking-wide">Saldo acumulado de Luis</span>
            </div>
            <p className="mt-1.5 text-4xl font-semibold tracking-tight text-text">
              <AnimatedMoney value={acumulado} />
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={acumulado === 0 ? "success" : "accent"}>{favor(acumulado)}</Badge>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <ReporteLuisButton
              fecha={fecha}
              consignaciones={consignaciones}
              compensaciones={compensaciones}
              acumulado={acumulado}
              acumuladoAyer={acumuladoAyer}
            />
            <p className="flex items-center gap-1.5 text-[0.72rem] text-faint">
              <TrendUp size={13} />
              Venía de ayer: <span className="tnum text-muted">{formatCOP(acumuladoAyer)}</span>
            </p>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="relative mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
          <DiaStat label="Cupo de hoy" value={totalComp} />
          <DiaStat label="Consignaciones" value={totalConsig} />
          <DiaStat label="Movimiento del día" value={saldoDia} signed />
        </div>
      </Card>

      {/* Las dos listas */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MovimientosSection
          fecha={fecha}
          items={compensaciones}
          titulo="Compensación (cupo)"
          subtitulo="El cupo que Luis te da en el día"
          emptyText="Sin compensaciones aún."
          tono="comp"
          agregar={agregarCompensacion}
          eliminar={eliminarCompensacion}
          editar={editarCompensacion}
        />
        <MovimientosSection
          fecha={fecha}
          items={consignaciones}
          titulo="Consignaciones"
          subtitulo="Lo que se consignó con su cupo"
          emptyText="Sin consignaciones aún."
          tono="consig"
          agregar={agregarConsignacion}
          eliminar={eliminarConsignacion}
          editar={editarConsignacion}
        />
      </div>
    </div>
  );
}

function DiaStat({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="px-4 first:pl-0">
      <p className="text-[0.7rem] uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tracking-tight tnum", signed && value !== 0 ? (value > 0 ? "text-accent-strong" : "text-success") : "text-text")}>
        {formatCOP(value)}
      </p>
    </div>
  );
}
