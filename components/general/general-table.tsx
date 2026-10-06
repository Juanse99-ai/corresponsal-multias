"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
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
        <Empty>
          <EmptyTitle>Aún no hay días registrados en el control general</EmptyTitle>
        </Empty>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-text">
          <h2>Historial</h2>
        </CardTitle>
        <CardAction className="self-center">
          <IconButton label="Descargar Excel" size="icon-sm" onClick={exportar}>
            <DownloadSimple size={18} weight="bold" />
          </IconButton>
        </CardAction>
      </CardHeader>

      {/* Celular: renglones en la misma tarjeta. Nueve columnas no caben en un teléfono. */}
      <ItemGroup className="divide-y divide-linea-fila px-5 pb-3 md:hidden">
        {entries.map((e) => {
          const total = computeSaldoTotal(e);
          return (
            <Item key={e.id} asChild className="cursor-pointer flex-nowrap items-start gap-3 rounded-none px-0 py-3">
              <div
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
                <ItemContent className="min-w-0 gap-1">
                  <ItemTitle className="text-title font-semibold">{formatFecha(e.fecha)}</ItemTitle>
                  <ItemDescription className="line-clamp-none text-faint">
                    Saldo Luis <span className="tnum text-muted">{formatCOP(e.saldo_luis)}</span>, cupo{" "}
                    <span className="tnum text-muted">{formatCOP(e.cupo_disponible)}</span>, efectivo{" "}
                    <span className="tnum text-muted">{formatCOP(e.efectivo)}</span>, deudas{" "}
                    <span className="tnum text-muted">{formatCOP(e.deudas_terceros)}</span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="shrink-0 flex-col items-end gap-0.5">
                  <span className="text-meta text-faint">Saldo total</span>
                  <span className={cn("tnum text-lead font-semibold", total < 0 ? "text-bad-fg" : "text-text")}>
                    {formatCOP(total)}
                  </span>
                </ItemActions>
              </div>
            </Item>
          );
        })}
      </ItemGroup>

      <Table contenedorClassName="max-md:hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Saldo Luis</TableHead>
            <TableHead className="text-right">Cristian</TableHead>
            <TableHead className="text-right">Cupo</TableHead>
            <TableHead className="text-right">Efectivo</TableHead>
            <TableHead className="text-right">Nequis</TableHead>
            <TableHead className="text-right">Monedas</TableHead>
            <TableHead className="text-right">Deudas</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-10" />
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
                className="cursor-pointer"
              >
                <TableCell className="font-medium text-text">{formatFecha(e.fecha)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.saldo_luis)}</TableCell>
                <TableCell className={cn("tnum text-right", e.saldo_cristian < 0 ? "text-bad-fg" : "text-muted")}>{formatCOP(e.saldo_cristian)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.cupo_disponible)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.efectivo)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.nequis)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.monedas)}</TableCell>
                <TableCell className="tnum text-right text-muted">{formatCOP(e.deudas_terceros)}</TableCell>
                <TableCell className={cn("tnum text-right font-semibold", total < 0 ? "text-bad-fg" : "text-text")}>{formatCOP(total)}</TableCell>
                <TableCell className="py-0 pr-2 pl-0">
                  <IconButton
                    label="Borrar registro"
                    size="icon-sm"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setPorBorrar(e.id);
                    }}
                    disabled={pending}
                    peligro
                  >
                    <Trash size={16} />
                  </IconButton>
                </TableCell>
              </MotionTableRow>
            );
          })}
        </TableBody>
      </Table>
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este día del control general?"
        onConfirmar={() => porBorrar && borrar(porBorrar)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
