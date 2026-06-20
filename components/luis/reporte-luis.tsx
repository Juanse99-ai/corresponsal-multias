"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Export, DownloadSimple, ShareNetwork, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { formatCOP, formatHora } from "@/lib/format";
import type { MovimientoItem } from "@/components/luis/movimientos-section";

function fechaDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ReporteLuisButton({
  fecha,
  consignaciones,
  compensaciones,
  acumulado,
  acumuladoAyer,
}: {
  fecha: string;
  consignaciones: MovimientoItem[];
  compensaciones: MovimientoItem[];
  acumulado: number;
  acumuladoAyer: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const totalConsig = consignaciones.reduce((s, c) => s + c.monto, 0);
  // El arrastre del día anterior es la primera compensación a favor de Luis.
  const totalComp = compensaciones.reduce((s, c) => s + c.monto, 0) + acumuladoAyer;

  async function generar(): Promise<Blob | null> {
    if (!ref.current) return null;
    const { toBlob } = await import("html-to-image");
    return toBlob(ref.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  }

  async function descargar() {
    setBusy(true);
    try {
      const blob = await generar();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-luis-${fecha}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function compartir() {
    setBusy(true);
    try {
      const blob = await generar();
      if (!blob) return;
      const file = new File([blob], `reporte-luis-${fecha}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Reporte Luis ${fechaDMY(fecha)}` });
      } else {
        await descargar();
      }
    } catch {
      /* cancelado */
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-[460px]"
          >
            <div
              ref={ref}
              style={{ fontFamily: "var(--font-ios)" }}
              className="overflow-hidden rounded-[1.1rem] bg-white text-zinc-900"
            >
              <div className="border-b border-zinc-200 px-6 py-4 text-center">
                <p className="text-lg font-bold tracking-tight">{fechaDMY(fecha)}</p>
                <p className="mt-0.5 text-[0.7rem] font-medium text-zinc-500">Reporte para Sr. Luis</p>
              </div>

              <div className="grid grid-cols-2">
                <ColumnaReporte
                  titulo="COMPENSACIÓN"
                  items={compensaciones}
                  total={totalComp}
                  leading={acumuladoAyer ? { label: "Arrastre", monto: acumuladoAyer } : undefined}
                  borde
                />
                <ColumnaReporte titulo="CONSIGNACIONES" items={consignaciones} total={totalConsig} />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-[#bfe9cb] px-6 py-3">
                <span className="text-[0.78rem] font-bold tracking-tight text-zinc-800">
                  SALDO ACUMULADO A FAVOR DE LUIS
                </span>
                <span className="text-sm font-bold tabular-nums text-zinc-900">{formatCOP(acumulado)}</span>
              </div>

              <div className="px-6 py-2.5 text-center text-[0.62rem] text-zinc-400">
                Multidiagnósticos AS
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button onClick={descargar} disabled={busy} className="flex-1 text-white">
                <DownloadSimple size={17} weight="bold" />
                {busy ? "Generando…" : "Descargar imagen"}
              </Button>
              <Button variant="secondary" onClick={compartir} disabled={busy} className="text-white">
                <ShareNetwork size={17} />
                Compartir
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-white">
                <X size={18} />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        <Export size={17} weight="bold" />
        Reporte para Luis
      </Button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

function ColumnaReporte({
  titulo,
  items,
  total,
  borde,
  leading,
}: {
  titulo: string;
  items: MovimientoItem[];
  total: number;
  borde?: boolean;
  leading?: { label: string; monto: number };
}) {
  const vacio = !leading && items.length === 0;
  return (
    <div className={borde ? "border-r border-zinc-200" : ""}>
      <div className="bg-[#f6e3d2] px-3 py-2 text-center text-[0.74rem] font-bold tracking-tight text-zinc-800">
        {titulo}
      </div>
      <div className="min-h-[80px] divide-y divide-zinc-100">
        {vacio ? (
          <p className="px-3 py-6 text-center text-sm text-zinc-300">—</p>
        ) : (
          <>
            {leading && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8rem]">
                <span className="font-medium text-zinc-500">{leading.label}</span>
                <span className="font-medium tabular-nums text-zinc-800">{formatCOP(leading.monto)}</span>
              </div>
            )}
            {items.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8rem]"
              >
                <span className="tabular-nums text-zinc-400">{c.hora ? formatHora(c.hora) : ""}</span>
                <span className="font-medium tabular-nums text-zinc-800">{formatCOP(c.monto)}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="bg-[#8ce99a] px-3 py-2 text-center text-[0.86rem] font-bold tabular-nums text-zinc-900">
        {formatCOP(total)}
      </div>
    </div>
  );
}
