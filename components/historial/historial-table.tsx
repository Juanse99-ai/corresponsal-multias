"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, MagnifyingGlass, Trash, CheckCircle, Warning, X } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import type { CuadreRow } from "@/lib/database.types";
import { eliminarCuadre } from "@/app/(app)/cuadre/actions";

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
    <div className="flex flex-col gap-5">
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Eliminar este cierre?"
        detalle="No se puede deshacer."
        confirmar="Sí, eliminar"
        onConfirmar={confirmarBorrado}
        onCancelar={() => setPorBorrar(null)}
      />
      {/* Filtros + stats */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <Label htmlFor="hist-desde" className="text-[0.72rem] font-normal text-faint">Desde</Label>
              <DatePicker id="hist-desde" value={desde} onChange={setDesde} placeholder="Desde" className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <Label htmlFor="hist-hasta" className="text-[0.72rem] font-normal text-faint">Hasta</Label>
              <DatePicker id="hist-hasta" value={hasta} onChange={setHasta} placeholder="Hasta" className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
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

        <Separator />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Días" value={String(totales.dias)} />
          <Stat label="Descuadres" value={String(totales.descuadres)} tone={totales.descuadres > 0 ? "danger" : "success"} />
          <Stat label="Tirilla total" value={formatCOP(totales.tirilla)} mono />
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <Empty className="py-16 md:py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-full text-faint">
                <MagnifyingGlass size={20} />
              </EmptyMedia>
              <EmptyDescription>No hay cierres en este rango.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
        {/* Celular: una ficha por día. La tabla obligaba a arrastrar en horizontal
            dentro de una página que ya se desliza en vertical. */}
        <div className="flex flex-col gap-3 md:hidden">
          {filtrados.map((c) => {
            const descuadre = Math.round(c.saldo_final) !== 0;
            return (
              <Card
                key={c.id}
                className={cn("cursor-pointer", descuadre && "border-danger/35")}
                onClick={() => router.push(`/cuadre?fecha=${c.fecha}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/cuadre?fecha=${c.fecha}`);
                  }
                }}
              >
                <CardHeader className="gap-1 px-4 pt-4 pb-3 sm:px-4 sm:pt-4">
                  <CardTitle className="text-text">{formatFecha(c.fecha)}</CardTitle>
                  <CardDescription>
                    <Badge variant={descuadre ? "danger" : c.estado === "cerrado" ? "success" : "secondary"}>
                      {descuadre ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                      {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                    </Badge>
                  </CardDescription>
                  <CardAction className="text-right">
                    <p className="text-[0.66rem] uppercase tracking-wide text-faint">Saldo final</p>
                    <p className={cn("tnum text-[1.35rem] font-semibold", descuadre ? "text-danger" : "text-text")}>
                      {formatCOP(c.saldo_final)}
                    </p>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-4 sm:pb-4">
                  <Separator />
                  <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 pt-3 text-[0.8rem]">
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <span className="text-faint">Tirilla</span>
                      <span className="tnum text-text">{formatCOP(c.total_tirilla)}</span>
                    </div>
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <span className="text-faint">Sr. Luis</span>
                      <span className="tnum text-text">{formatCOP(c.sr_luis)}</span>
                    </div>
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <span className="text-faint">Compensado</span>
                      <span className="tnum text-text">{formatCOP(c.compensado)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-end">
                        <IconButton label="Eliminar cierre" onClick={(e) => borrar(c.id, e)} disabled={pending} className="text-muted hover:text-destructive">
                          <Trash size={17} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="hidden overflow-hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-line text-[0.72rem] uppercase tracking-wide hover:bg-transparent">
                <TableHead className="h-auto px-5 py-3 text-faint">Fecha</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Tirilla</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Sr. Luis</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Compensado</TableHead>
                <TableHead className="h-auto px-3 py-3 text-right text-faint">Saldo final</TableHead>
                <TableHead className="h-auto px-5 py-3 text-right text-faint">Estado</TableHead>
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
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => router.push(`/cuadre?fecha=${c.fecha}`)}
                    className="cursor-pointer border-line/60 hover:bg-surface-2"
                  >
                    <TableCell className="px-5 py-3 font-medium text-text">{formatFecha(c.fecha)}</TableCell>
                    <TableCell className="tnum px-3 py-3 text-right text-text">{formatCOP(c.total_tirilla)}</TableCell>
                    <TableCell className="tnum px-3 py-3 text-right text-muted">{formatCOP(c.sr_luis)}</TableCell>
                    <TableCell className="tnum px-3 py-3 text-right text-muted">{formatCOP(c.compensado)}</TableCell>
                    <TableCell className={cn("tnum px-3 py-3 text-right font-semibold", descuadre ? "text-danger" : "text-text")}>
                      {formatCOP(c.saldo_final)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Badge variant={descuadre ? "danger" : c.estado === "cerrado" ? "success" : "secondary"}>
                        {descuadre ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                        {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="py-0 pr-3 pl-0">
                        <IconButton label="Eliminar cierre" size="icon-sm" onClick={(e) => borrar(c.id, e)} disabled={pending} className="text-muted hover:text-destructive">
                          <Trash size={16} />
                        </IconButton>
                      </TableCell>
                    )}
                  </MotionRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone, mono }: { label: string; value: string; tone?: "danger" | "success"; mono?: boolean }) {
  return (
    <div className="px-0 py-2 first:pt-0 sm:px-4 sm:py-0 sm:first:pl-0">
      <p className="text-[0.72rem] text-faint">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[0.95rem] font-semibold text-text sm:text-base",
          mono && "tnum",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}
