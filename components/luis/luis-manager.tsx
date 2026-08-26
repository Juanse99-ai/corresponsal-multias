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
      {/* Saldo acumulado de Sr. Luis (su dinero) */}
      <Card className="relative overflow-hidden border-accent/25 p-6">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-faint">
              <Wallet size={15} weight="fill" className="text-accent" />
              <span className="text-[0.72rem] uppercase tracking-wide">Saldo acumulado de Sr. Luis</span>
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
        <div className="relative mt-6 grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 border-t border-line pt-4">
          <DiaStat label="Cupo de hoy" value={totalComp} />
          <DiaStat label="Consignaciones" value={totalConsig} />
          <DiaStat label="Del día" value={saldoDia} />
        </div>
      </Card>

      {/* Las dos listas */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MovimientosSection
          fecha={fecha}
          items={compensaciones}
          titulo="Cupo que dio"
          subtitulo="Lo que Sr. Luis presta en el día"
          emptyText="Sin cupo registrado aún."
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

function DiaStat({ label, value }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="px-0 py-2 sm:px-4 sm:py-0 sm:first:pl-0">
      <p className="text-[0.7rem] uppercase tracking-wide text-faint">{label}</p>
      {/* Neutro con su signo: el color se reserva para estado (cuadrado / descuadre). */}
      <p className="tnum mt-1 text-base font-semibold tracking-tight text-text sm:text-lg">
        {formatCOP(value)}
      </p>
    </div>
  );
}
