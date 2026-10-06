"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, Trash, X } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Celdas, Celda } from "@/components/ui/celdas";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import type { CuadreRow } from "@/lib/database.types";
import { eliminarCuadre } from "@/app/(app)/cuadre/actions";
import { TRANSICION } from "@/lib/movimiento";

// Fila de tabla de shadcn animada con Framer (React 19 pasa la ref como prop).
const MotionRow = motion.create(TableRow);

export function HistorialTable({ cuadres, isAdmin }: { cuadres: CuadreRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(
    () =>
      cuadres.filter((c) => (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta)),
    [cuadres, desde, hasta],
  );

  const totales = useMemo(() => {
    const tirilla = filtrados.reduce((s, c) => s + c.total_tirilla, 0);
    const descuadres = filtrados.filter((c) => Math.round(c.saldo_final) !== 0).length;
    return { tirilla, descuadres, dias: filtrados.length };
  }, [filtrados]);

  async function exportar() {
    const XLSX = await import("xlsx");
    const rows = filtrados.map((c) => ({
      Fecha: c.fecha,
      "Total tirilla": c.total_tirilla,
      "Sr. Luis": c.sr_luis,
      Efectivo: c.efectivo_consignaciones + c.retiros_cash,
      Compensado: c.compensado,
      Nequis: c.nequis,
      "Préstamos/consig.": c.prestamos_consignaciones,
      "Ret. real": c.ret_real,
      "Saldo final": c.saldo_final,
      Estado: c.estado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cierres");
    XLSX.writeFile(wb, `cierres-corresponsal-${desde || "todos"}.xlsx`);
  }

  // window.confirm se ve como alerta del sistema y en la PWA de iOS falla.
  const [porBorrar, setPorBorrar] = useState<string | null>(null);

  function borrar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPorBorrar(id);
  }

  function confirmarBorrado() {
    const id = porBorrar;
    setPorBorrar(null);
    if (!id) return;
    startTransition(async () => {
      await eliminarCuadre(id);
      router.refresh();
    });
  }

  return (
    <Card>
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este cierre?"
        detalle="No se puede deshacer."
        confirmar="Sí, borrar"
        onConfirmar={confirmarBorrado}
        onCancelar={() => setPorBorrar(null)}
      />
      {/* Barra de filtros dentro de la tarjeta de la lista. */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5">
        <DatePicker
          id="hist-desde"
          variante="filtro"
          value={desde}
          onChange={setDesde}
          placeholder="Desde"
          aria-label="Desde"
          className="w-[8.75rem]"
        />
        <DatePicker
          id="hist-hasta"
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

      {/* Lo que suma el rango, en celdas sobre la lista. */}
      <div className="px-5 pt-4 pb-3">
        <Celdas>
          <Celda rotulo="Días">{totales.dias}</Celda>
          <Celda rotulo="Descuadres">
            {totales.descuadres > 0 ? <Badge variant="danger">{totales.descuadres}</Badge> : totales.descuadres}
          </Celda>
          <Celda rotulo="Tirilla total">{formatCOP(totales.tirilla)}</Celda>
        </Celdas>
      </div>

      {filtrados.length === 0 ? (
        <Empty fila className="px-5 pb-5">
          <EmptyTitle>No hay cierres en este rango</EmptyTitle>
        </Empty>
      ) : (
        <>
        {/* Celular: renglones en la misma tarjeta. La tabla obligaba a arrastrar
            en horizontal dentro de una página que ya se desliza en vertical. */}
        <ItemGroup className="divide-y divide-linea-fila px-5 pb-3 md:hidden">
          {filtrados.map((c) => {
            const descuadre = Math.round(c.saldo_final) !== 0;
            return (
              <Item
                key={c.id}
                asChild
                className="cursor-pointer flex-nowrap items-start gap-3 rounded-none px-0 py-3"
              >
                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/cuadre?fecha=${c.fecha}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/cuadre?fecha=${c.fecha}`);
                    }
                  }}
                >
                  <ItemContent className="min-w-0 gap-1">
                    <ItemTitle className="w-full min-w-0 flex-wrap gap-2">
                      <span>{formatFecha(c.fecha)}</span>
                      <Badge punto={descuadre ? "bad" : c.estado === "cerrado" ? "ok" : "gris"}>
                        {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription className="line-clamp-none text-faint">
                      Tirilla <span className="tnum text-muted">{formatCOP(c.total_tirilla)}</span>, Sr. Luis{" "}
                      <span className="tnum text-muted">{formatCOP(c.sr_luis)}</span>, compensado{" "}
                      <span className="tnum text-muted">{formatCOP(c.compensado)}</span>
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="shrink-0 flex-col items-end gap-1">
                    <span className={cn("tnum text-lead font-semibold", descuadre ? "text-bad-fg" : "text-text")}>
                      {formatCOP(c.saldo_final)}
                    </span>
                    {isAdmin && (
                      <IconButton label="Borrar cierre" size="icon-sm" onClick={(e) => borrar(c.id, e)} disabled={pending} peligro>
                        <Trash size={16} />
                      </IconButton>
                    )}
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
              <TableHead className="text-right">Tirilla</TableHead>
              <TableHead className="text-right">Sr. Luis</TableHead>
              <TableHead className="text-right">Compensado</TableHead>
              <TableHead className="text-right">Saldo final</TableHead>
              <TableHead className="text-right">Estado</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c, i) => {
              const descuadre = Math.round(c.saldo_final) !== 0;
              return (
                <MotionRow
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ ...TRANSICION, delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => router.push(`/cuadre?fecha=${c.fecha}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium text-text">{formatFecha(c.fecha)}</TableCell>
                  <TableCell className="tnum text-right text-text">{formatCOP(c.total_tirilla)}</TableCell>
                  <TableCell className="tnum text-right text-muted">{formatCOP(c.sr_luis)}</TableCell>
                  <TableCell className="tnum text-right text-muted">{formatCOP(c.compensado)}</TableCell>
                  <TableCell className={cn("tnum text-right font-semibold", descuadre ? "text-bad-fg" : "text-text")}>
                    {formatCOP(c.saldo_final)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge punto={descuadre ? "bad" : c.estado === "cerrado" ? "ok" : "gris"}>
                      {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-0 pr-2 pl-0">
                      <IconButton label="Borrar cierre" size="icon-sm" onClick={(e) => borrar(c.id, e)} disabled={pending} peligro>
                        <Trash size={16} />
                      </IconButton>
                    </TableCell>
                  )}
                </MotionRow>
              );
            })}
          </TableBody>
        </Table>
        </>
      )}
    </Card>
  );
}
