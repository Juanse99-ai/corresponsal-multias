"use client";

import { Card } from "@/components/ui/card";
import { Celdas, Celda } from "@/components/ui/celdas";
import { formatCOP } from "@/lib/format";
import type { ConsignacionLuisRow, CompensacionLuisRow } from "@/lib/database.types";
import { MovimientosSection } from "@/components/luis/movimientos-section";
import {
  agregarConsignacion,
  eliminarConsignacion,
  editarConsignacion,
  agregarCompensacion,
  eliminarCompensacion,
  editarCompensacion,
  agregarConsignacionesLote,
  agregarCompensacionesLote,
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

  return (
    <div className="flex flex-col gap-5">
      {/* El saldo acumulado va en la cabecera de la pantalla; aquí, el día en celdas. */}
      <Card className="p-5">
        <Celdas>
          <Celda rotulo="Venía de ayer">{formatCOP(acumuladoAyer)}</Celda>
          <Celda rotulo="Cupo del día">{formatCOP(totalComp)}</Celda>
          <Celda rotulo="Consignaciones">{formatCOP(totalConsig)}</Celda>
          <Celda rotulo="Del día">{formatCOP(saldoDia)}</Celda>
        </Celdas>
      </Card>

      {/* Las dos listas */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MovimientosSection
          fecha={fecha}
          items={compensaciones}
          titulo="Cupo que dio"
          subtitulo="Lo que el Sr. Luis presta en el día"
          emptyText="Sin cupo registrado aún"
          tono="comp"
          agregar={agregarCompensacion}
          agregarLote={agregarCompensacionesLote}
          eliminar={eliminarCompensacion}
          editar={editarCompensacion}
        />
        <MovimientosSection
          fecha={fecha}
          items={consignaciones}
          titulo="Consignaciones"
          subtitulo="Lo que se consignó con su cupo"
          emptyText="Sin consignaciones aún"
          tono="consig"
          agregar={agregarConsignacion}
          agregarLote={agregarConsignacionesLote}
          eliminar={eliminarConsignacion}
          editar={editarConsignacion}
        />
      </div>
    </div>
  );
}
