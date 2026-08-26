"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, MagnifyingGlass, CaretRight, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import type { LuisHistDia } from "@/lib/queries";

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
        <div className="flex items-center gap-3 rounded-[1rem] border border-accent/25 bg-accent-soft/40 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <Wallet size={20} weight="fill" />
          </div>
          <div className="leading-tight">
            <p className="text-[0.74rem] font-medium uppercase tracking-wide text-faint">
              Saldo acumulado a favor de Luis
            </p>
            <p className="tnum mt-0.5 text-2xl font-semibold tracking-tight text-text">
              {formatCOP(acumuladoActual)}
            </p>
          </div>
        </div>

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
      </Card>

      {filtrados.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
            <MagnifyingGlass size={20} />
          </div>
          <p className="text-sm text-muted">No hay movimientos de Luis en este rango.</p>
        </Card>
      ) : (
        <>
        {/* Celular: una ficha por día en vez de arrastrar la tabla en horizontal. */}
        <div className="flex flex-col gap-3 md:hidden">
          {filtrados.map((d) => (
            <Card
              key={d.fecha}
              className="p-4"
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.95rem] font-semibold text-text">{formatFecha(d.fecha)}</p>
                <div className="shrink-0 text-right">
                  <p className="text-[0.66rem] uppercase tracking-wide text-faint">Acumulado a favor</p>
                  <p className="tnum text-[1.35rem] font-semibold text-text">{formatCOP(d.acumulado)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2 border-t border-line pt-3 text-[0.8rem]">
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
            </Card>
          ))}
        </div>

        <Card className="hidden overflow-hidden p-0 md:block">
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[0.72rem] uppercase tracking-wide text-faint">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 text-right font-medium">Consignaciones</th>
                  <th className="px-3 py-3 text-right font-medium">Compensaciones</th>
                  <th className="px-3 py-3 text-right font-medium">Saldo del día</th>
                  <th className="px-3 py-3 text-right font-medium">Acumulado a favor</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, i) => (
                  <motion.tr
                    key={d.fecha}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => router.push(`/luis?fecha=${d.fecha}`)}
                    className="cursor-pointer border-b border-line/60 transition-colors hover:bg-surface-2"
                    title="Ver el día y abrir el reporte" aria-label="Ver el día y abrir el reporte"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-text">{formatFecha(d.fecha)}</td>
                    <td className="tnum px-3 py-3 text-right text-muted">{formatCOP(d.consignaciones)}</td>
                    <td className="tnum px-3 py-3 text-right text-muted">{formatCOP(d.compensaciones)}</td>
                    <td className={cn("tnum px-3 py-3 text-right font-medium", d.saldoDia < 0 ? "text-danger" : "text-text")}>
                      {formatCOP(d.saldoDia)}
                    </td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-text">{formatCOP(d.acumulado)}</td>
                    <td className="pr-4 text-right">
                      <CaretRight size={15} className="text-faint" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
    </div>
  );
}
