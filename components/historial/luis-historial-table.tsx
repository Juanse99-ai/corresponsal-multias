"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, MagnifyingGlass, CaretRight, Wallet, X } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
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
    <div className="flex flex-col gap-5">
      {/* Acumulado vigente + filtros */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <Item variant="outline" className="gap-3 rounded-[1rem] border-accent/25 bg-accent-soft/40 p-4">
          <ItemMedia className="h-11 w-11 rounded-full bg-accent-soft text-accent-strong">
            <Wallet size={20} weight="fill" />
          </ItemMedia>
          <ItemContent className="gap-0.5 leading-tight">
            <ItemDescription className="text-[0.78rem] font-medium text-muted">
              Saldo acumulado a favor de Luis
            </ItemDescription>
            <ItemTitle className="tnum text-2xl font-semibold tracking-tight text-text">
              {formatCOP(acumuladoActual)}
            </ItemTitle>
          </ItemContent>
        </Item>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <Label htmlFor="luis-desde" className="text-[0.72rem] font-normal text-faint">Desde</Label>
              <DatePicker id="luis-desde" value={desde} onChange={setDesde} placeholder="Desde" className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <Label htmlFor="luis-hasta" className="text-[0.72rem] font-normal text-faint">Hasta</Label>
              <DatePicker id="luis-hasta" value={hasta} onChange={setHasta} placeholder="Hasta" className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
            </div>
            {(desde || hasta) && (
              <IconButton label="Limpiar fechas" onClick={() => { setDesde(""); setHasta(""); }} className="text-muted hover:text-foreground">
                <X size={17} />
              </IconButton>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={exportar} disabled={filtrados.length === 0}>
            <DownloadSimple size={16} weight="bold" />
            Excel
          </Button>
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <Empty className="py-16 md:py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-full text-faint">
                <MagnifyingGlass size={20} />
              </EmptyMedia>
              <EmptyDescription>No hay movimientos de Luis en este rango.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
        {/* Celular: una ficha por día en vez de arrastrar la tabla en horizontal. */}
        <div className="flex flex-col gap-3 md:hidden">
          {filtrados.map((d) => (
            <Card
              key={d.fecha}
              className="cursor-pointer"
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
              <CardHeader className="px-4 pt-4 pb-3 sm:px-4 sm:pt-4">
                <CardTitle className="text-text">{formatFecha(d.fecha)}</CardTitle>
                <CardAction className="text-right">
                  <p className="text-[0.78rem] text-muted">Acumulado a favor</p>
                  <p className="tnum text-[1.35rem] font-semibold text-text">{formatCOP(d.acumulado)}</p>
                </CardAction>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-4 sm:pb-4">
                <Separator />
                <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 pt-3 text-[0.8rem]">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="text-faint">Consignaciones</span>
                    <span className="tnum text-text">{formatCOP(d.consignaciones)}</span>
                  </div>
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="text-faint">Cupo</span>
                    <span className="tnum text-text">{formatCOP(d.compensaciones)}</span>
                  </div>
                  <div className="col-span-2 flex min-w-0 items-baseline justify-between gap-2">
                    <span className="text-faint">Del día</span>
                    <span className="tnum font-medium text-text">{formatCOP(d.saldoDia)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="hidden overflow-hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-line text-[0.78rem] hover:bg-transparent">
                <TableHead className="h-auto px-5 py-3 text-faint">Fecha</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Consignaciones</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Compensaciones</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Saldo del día</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Acumulado a favor</TableHead>
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
                  className="cursor-pointer border-line/60 hover:bg-surface-2"
                  title="Ver el día y abrir el reporte" aria-label="Ver el día y abrir el reporte"
                >
                  <TableCell className="px-5 py-3 font-medium text-text">{formatFecha(d.fecha)}</TableCell>
                  <TableCell className="tnum px-3 py-3 text-right text-muted">{formatCOP(d.consignaciones)}</TableCell>
                  <TableCell className="tnum px-3 py-3 text-right text-muted">{formatCOP(d.compensaciones)}</TableCell>
                  <TableCell className={cn("tnum px-3 py-3 text-right font-medium", d.saldoDia < 0 ? "text-danger" : "text-text")}>
                    {formatCOP(d.saldoDia)}
                  </TableCell>
                  <TableCell className="tnum px-3 py-3 text-right font-semibold text-text">{formatCOP(d.acumulado)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <CaretRight size={15} className="text-faint" />
                  </TableCell>
                </MotionRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        </>
      )}
    </div>
  );
}
