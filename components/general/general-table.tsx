"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, Trash, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import { computeSaldoTotal } from "@/lib/general";
import type { GeneralRow } from "@/lib/database.types";
import { eliminarGeneral } from "@/app/(app)/general/actions";

const MotionTableRow = motion.create(TableRow);

export function GeneralTable({ entries }: { entries: GeneralRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [porBorrar, setPorBorrar] = useState<string | null>(null);

  async function exportar() {
    const XLSX = await import("xlsx");
    const rows = entries.map((e) => ({
      Fecha: e.fecha,
      "Saldo Luis": e.saldo_luis,
      "Saldo Cristian": e.saldo_cristian,
      "Cupo disponible": e.cupo_disponible,
      Efectivo: e.efectivo,
      Nequis: e.nequis,
      Monedas: e.monedas,
      "Deudas de terceros": e.deudas_terceros,
      "Saldo total": computeSaldoTotal(e),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Control general");
    XLSX.writeFile(wb, `control-general-corresponsal.xlsx`);
  }

  function borrar(id: string) {
    setPorBorrar(null);
    startTransition(async () => {
      await eliminarGeneral(id);
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <Card>
        <Empty className="py-12 md:py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarBlank />
            </EmptyMedia>
            <EmptyTitle className="text-sm font-normal text-muted">
              Aún no hay días registrados en el control general.
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="items-center border-b border-line px-5 py-3 sm:px-5 sm:pt-3 [.border-b]:pb-3">
        <CardTitle className="self-center text-[0.9rem] text-text">
          <h3>Historial</h3>
        </CardTitle>
        <CardAction className="self-center">
          <Button variant="secondary" size="sm" onClick={exportar}>
            <DownloadSimple size={15} weight="bold" />
            Excel
          </Button>
        </CardAction>
      </CardHeader>
      {/* Celular: una ficha por día. Nueve columnas no caben en un teléfono. */}
      <div className="flex flex-col gap-3 md:hidden">
        {entries.map((e) => {
          const total = computeSaldoTotal(e);
          return (
            <Card
              key={e.id}
              className={cn("p-4", total < 0 && "border-danger/35")}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/general?fecha=${e.fecha}`)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  router.push(`/general?fecha=${e.fecha}`);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.95rem] font-semibold text-text">{formatFecha(e.fecha)}</p>
                <div className="shrink-0 text-right">
                  <p className="text-[0.78rem] text-muted">Saldo total</p>
                  <p className={cn("tnum text-[1.35rem] font-semibold", total < 0 ? "text-danger" : "text-text")}>
                    {formatCOP(total)}
                  </p>
                </div>
              </div>
              <Separator className="mt-3 bg-line" />
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 pt-3 text-[0.8rem]">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="text-faint">Saldo Luis</span>
                  <span className="tnum text-text">{formatCOP(e.saldo_luis)}</span>
                </div>
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="text-faint">Cupo</span>
                  <span className="tnum text-text">{formatCOP(e.cupo_disponible)}</span>
                </div>
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="text-faint">Efectivo</span>
                  <span className="tnum text-text">{formatCOP(e.efectivo)}</span>
                </div>
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="text-faint">Deudas</span>
                  <span className="tnum text-text">{formatCOP(e.deudas_terceros)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-line text-left text-[0.78rem] text-muted hover:bg-transparent">
              <TableHead className="h-auto px-5 py-3 font-medium text-faint">Fecha</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Saldo Luis</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Cristian</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Cupo</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Efectivo</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Nequis</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Monedas</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Deudas</TableHead>
              <TableHead className="h-auto px-3 py-3 text-right font-medium text-faint">Total</TableHead>
              <TableHead className="h-auto w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, i) => {
              const total = computeSaldoTotal(e);
              return (
                <MotionTableRow
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => router.push(`/general?fecha=${e.fecha}`)}
                  className="cursor-pointer border-line/60 hover:bg-surface-2"
                >
                  <TableCell className="px-5 py-2.5 font-medium text-text">{formatFecha(e.fecha)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.saldo_luis)}</TableCell>
                  <TableCell className={cn("tnum px-3 py-2.5 text-right", e.saldo_cristian < 0 ? "text-danger" : "text-muted")}>{formatCOP(e.saldo_cristian)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.cupo_disponible)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.efectivo)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.nequis)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.monedas)}</TableCell>
                  <TableCell className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.deudas_terceros)}</TableCell>
                  <TableCell className={cn("tnum px-3 py-2.5 text-right font-semibold", total < 0 ? "text-danger" : "text-text")}>{formatCOP(total)}</TableCell>
                  <TableCell className="py-0 pl-0 pr-3">
                    <IconButton
                      label="Borrar registro"
                      size="icon-sm"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setPorBorrar(e.id);
                      }}
                      disabled={pending}
                      className="text-muted hover:text-destructive"
                    >
                      <Trash size={16} />
                    </IconButton>
                  </TableCell>
                </MotionTableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este día del control general?"
        onConfirmar={() => porBorrar && borrar(porBorrar)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
