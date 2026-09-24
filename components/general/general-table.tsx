"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DownloadSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha } from "@/lib/format";
import { computeSaldoTotal } from "@/lib/general";
import type { GeneralRow } from "@/lib/database.types";
import { eliminarGeneral } from "@/app/(app)/general/actions";

export function GeneralTable({ entries }: { entries: GeneralRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  function borrar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este día del control general?")) return;
    startTransition(async () => {
      await eliminarGeneral(id);
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-1 py-12 text-center">
        <p className="text-sm text-muted">Aún no hay días registrados en el control general.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="text-[0.9rem] font-semibold tracking-tight text-text">Histórico</h3>
        <Button variant="secondary" size="sm" onClick={exportar}>
          <DownloadSimple size={15} weight="bold" />
          Excel
        </Button>
      </div>
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
                  <p className="text-[0.66rem] uppercase tracking-wide text-faint">Saldo total</p>
                  <p className={cn("tnum text-[1.35rem] font-semibold", total < 0 ? "text-danger" : "text-text")}>
                    {formatCOP(total)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2 border-t border-line pt-3 text-[0.8rem]">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wide text-faint">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-3 py-3 text-right font-medium">Saldo Luis</th>
              <th className="px-3 py-3 text-right font-medium">Cristian</th>
              <th className="px-3 py-3 text-right font-medium">Cupo</th>
              <th className="px-3 py-3 text-right font-medium">Efectivo</th>
              <th className="px-3 py-3 text-right font-medium">Nequis</th>
              <th className="px-3 py-3 text-right font-medium">Monedas</th>
              <th className="px-3 py-3 text-right font-medium">Deudas</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const total = computeSaldoTotal(e);
              return (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => router.push(`/general?fecha=${e.fecha}`)}
                  className="cursor-pointer border-b border-line/60 transition-colors hover:bg-surface-2"
                >
                  <td className="whitespace-nowrap px-5 py-2.5 font-medium text-text">{formatFecha(e.fecha)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.saldo_luis)}</td>
                  <td className={cn("tnum px-3 py-2.5 text-right", e.saldo_cristian < 0 ? "text-danger" : "text-muted")}>{formatCOP(e.saldo_cristian)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.cupo_disponible)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.efectivo)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.nequis)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.monedas)}</td>
                  <td className="tnum px-3 py-2.5 text-right text-muted">{formatCOP(e.deudas_terceros)}</td>
                  <td className={cn("tnum px-3 py-2.5 text-right font-semibold", total < 0 ? "text-danger" : "text-text")}>{formatCOP(total)}</td>
                  <td className="pr-3">
                    <Button variant="ghost" size="icon-sm" aria-label="Eliminar registro" title="Eliminar registro" onClick={(ev) => borrar(e.id, ev)} disabled={pending} className="text-muted hover:text-destructive">
                      <Trash size={16} />
                    </Button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
