"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, CaretRight, X } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Celdas, Celda } from "@/components/ui/celdas";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import type { LuisHistDia } from "@/lib/queries";

// Fila de tabla de shadcn animada con Framer (React 19 pasa la ref como prop).
const MotionRow = motion.create(TableRow);

export function LuisHistorialTable({ dias }: { dias: LuisHistDia[] }) {
  const router = useRouter();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(
    () => dias.filter((d) => (!desde || d.fecha >= desde) && (!hasta || d.fecha <= hasta)),
    [dias, desde, hasta],
  );

  // El acumulado vigente es el del día más reciente (sin importar el filtro).
  const acumuladoActual = dias[0]?.acumulado ?? 0;

  async function exportar() {
    const XLSX = await import("xlsx");
    const rows = filtrados.map((d) => ({
      Fecha: d.fecha,
      Consignaciones: d.consignaciones,
      Compensaciones: d.compensaciones,
      "Saldo del día": d.saldoDia,
      "Acumulado a favor de Luis": d.acumulado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Luis");
    XLSX.writeFile(wb, `historial-luis-${desde || "todos"}.xlsx`);
  }

  return (
    <Card>
      {/* Barra de filtros dentro de la tarjeta de la lista. */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5">
        <DatePicker
          id="luis-desde"
          variante="filtro"
          value={desde}
          onChange={setDesde}
          placeholder="Desde"
          aria-label="Desde"
          className="w-[8.75rem]"
        />
        <DatePicker
          id="luis-hasta"
          variante="filtro"
          value={hasta}
          onChange={setHasta}
          placeholder="Hasta"
          aria-label="Hasta"
          className="w-[8.75rem]"
        />
        {(desde || hasta) && (
          <IconButton label="Limpiar fechas" forma="suelto" size="icon-inline" onClick={() => { setDesde(""); setHasta(""); }}>
            <X size={15} weight="bold" />
          </IconButton>
        )}
        <IconButton label="Descargar Excel" size="icon-sm" onClick={exportar} disabled={filtrados.length === 0} className="ml-auto">
          <DownloadSimple size={18} weight="bold" />
        </IconButton>
      </div>

      {/* El acumulado vigente en una celda, sin recuadro tintado. */}
      <div className="px-5 pt-4 pb-3">
        <Celdas className="grid-cols-1">
          <Celda rotulo="Saldo acumulado a favor de Luis" grande>
            {formatCOP(acumuladoActual)}
          </Celda>
        </Celdas>
      </div>

      {filtrados.length === 0 ? (
        <Empty fila className="px-5 pb-5">
          <EmptyTitle>No hay movimientos de Luis en este rango</EmptyTitle>
        </Empty>
      ) : (
        <>
        {/* Celular: renglones en la misma tarjeta en vez de arrastrar la tabla. */}
        <ItemGroup className="divide-y divide-linea-fila px-5 pb-3 md:hidden">
          {filtrados.map((d) => (
            <Item key={d.fecha} asChild className="cursor-pointer flex-nowrap items-start gap-3 rounded-none px-0 py-3">
              <div
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/luis?fecha=${d.fecha}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/luis?fecha=${d.fecha}`);
                  }
                }}
              >
                <ItemContent className="min-w-0 gap-1">
                  <ItemTitle>{formatFecha(d.fecha)}</ItemTitle>
                  <ItemDescription className="line-clamp-none text-faint">
                    Consignaciones <span className="tnum text-muted">{formatCOP(d.consignaciones)}</span>, cupo{" "}
                    <span className="tnum text-muted">{formatCOP(d.compensaciones)}</span>, del día{" "}
                    <span className="tnum text-muted">{formatCOP(d.saldoDia)}</span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="shrink-0 flex-col items-end gap-0.5">
                  <span className="tnum text-lead font-semibold text-text">{formatCOP(d.acumulado)}</span>
                  <span className="text-meta text-faint">Acumulado a favor</span>
                </ItemActions>
              </div>
            </Item>
          ))}
        </ItemGroup>

        <Table contenedorClassName="max-md:hidden">
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Consignaciones</TableHead>
              <TableHead className="text-right">Compensaciones</TableHead>
              <TableHead className="text-right">Saldo del día</TableHead>
              <TableHead className="text-right">Acumulado a favor</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((d, i) => (
              <MotionRow
                key={d.fecha}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => router.push(`/luis?fecha=${d.fecha}`)}
                className="cursor-pointer"
                title="Ver el día y abrir el reporte" aria-label="Ver el día y abrir el reporte"
              >
                <TableCell className="font-medium text-text">{formatFecha(d.fecha)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(d.consignaciones)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(d.compensaciones)}</TableCell>
                <TableCell className={cn("tnum text-right font-medium", d.saldoDia < 0 ? "text-bad-fg" : "text-text")}>
                  {formatCOP(d.saldoDia)}
                </TableCell>
                <TableCell className="tnum text-right font-semibold text-text">{formatCOP(d.acumulado)}</TableCell>
                <TableCell className="pr-4 text-right">
                  <CaretRight size={15} className="text-inerte" />
                </TableCell>
              </MotionRow>
            ))}
          </TableBody>
        </Table>
        </>
      )}
    </Card>
  );
}
