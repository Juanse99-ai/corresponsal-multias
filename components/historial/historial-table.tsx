"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, MagnifyingGlass, Trash, CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import type { CuadreRow } from "@/lib/database.types";
import { eliminarCuadre } from "@/app/(app)/cuadre/actions";

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

  function borrar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este cierre? No se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarCuadre(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros + stats */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <label className="text-[0.72rem] text-faint">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
              <label className="text-[0.72rem] text-faint">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10 w-full min-w-0 sm:w-[9.5rem]" />
            </div>
            {(desde || hasta) && (
              <button onClick={() => { setDesde(""); setHasta(""); }} className="h-10 px-2 text-[0.78rem] text-faint hover:text-muted">
                Limpiar
              </button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={exportar} disabled={filtrados.length === 0}>
            <DownloadSimple size={16} weight="bold" />
            Exportar Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 divide-y divide-line border-t border-line pt-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Días" value={String(totales.dias)} />
          <Stat label="Descuadres" value={String(totales.descuadres)} tone={totales.descuadres > 0 ? "danger" : "success"} />
          <Stat label="Tirilla total" value={formatCOP(totales.tirilla)} mono />
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
            <MagnifyingGlass size={20} />
          </div>
          <p className="text-sm text-muted">No hay cierres en este rango.</p>
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
                className={cn("p-4", descuadre && "border-danger/35")}
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.95rem] font-semibold text-text">{formatFecha(c.fecha)}</p>
                    <div className="mt-1">
                      <Badge tone={descuadre ? "danger" : c.estado === "cerrado" ? "success" : "neutral"}>
                        {descuadre ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                        {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[0.66rem] uppercase tracking-wide text-faint">Saldo final</p>
                    <p className={cn("tnum text-[1.35rem] font-semibold", descuadre ? "text-danger" : "text-success")}>
                      {formatCOP(c.saldo_final)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2 border-t border-line pt-3 text-[0.8rem]">
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
                      <button
                        onClick={(e) => borrar(c.id, e)}
                        disabled={pending}
                        title="Eliminar cierre"
                        aria-label="Eliminar cierre"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="hidden overflow-hidden p-0 md:block">
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[0.72rem] uppercase tracking-wide text-faint">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 text-right font-medium">Tirilla</th>
                  <th className="px-3 py-3 text-right font-medium">Sr. Luis</th>
                  <th className="px-3 py-3 text-right font-medium">Compensado</th>
                  <th className="px-3 py-3 text-right font-medium">Saldo final</th>
                  <th className="px-5 py-3 text-right font-medium">Estado</th>
                  {isAdmin && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => {
                  const descuadre = Math.round(c.saldo_final) !== 0;
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => router.push(`/cuadre?fecha=${c.fecha}`)}
                      className="cursor-pointer border-b border-line/60 transition-colors hover:bg-surface-2"
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-text">{formatFecha(c.fecha)}</td>
                      <td className="tnum px-3 py-3 text-right text-text">{formatCOP(c.total_tirilla)}</td>
                      <td className="tnum px-3 py-3 text-right text-muted">{formatCOP(c.sr_luis)}</td>
                      <td className="tnum px-3 py-3 text-right text-muted">{formatCOP(c.compensado)}</td>
                      <td className={cn("tnum px-3 py-3 text-right font-semibold", descuadre ? "text-danger" : "text-success")}>
                        {formatCOP(c.saldo_final)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge tone={descuadre ? "danger" : c.estado === "cerrado" ? "success" : "neutral"}>
                          {descuadre ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                          {descuadre ? "Descuadre" : c.estado === "cerrado" ? "Cerrado" : "Abierto"}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="pr-3">
                          <button
                            onClick={(e) => borrar(c.id, e)}
                            disabled={pending}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
