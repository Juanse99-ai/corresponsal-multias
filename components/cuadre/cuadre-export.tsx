"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Export, DownloadSimple, ShareNetwork, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/format";

interface Linea {
  label: string;
  value: number;
}

interface Arqueo {
  entro: number;
  retiros: number;
  prestamosEfectivo: number;
  compensado: number;
  esperado: number;
  contado: number;
  diferencia: number;
}

function fechaDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function CuadreExport({
  fecha,
  lineas,
  suma,
  tirilla,
  saldo,
  descuadre,
  estado,
  arqueo,
}: {
  fecha: string;
  lineas: Linea[];
  suma: number;
  tirilla: number;
  saldo: number;
  descuadre: boolean;
  estado: string;
  arqueo: Arqueo;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
      a.download = `cuadre-${fecha}.png`;
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
      const file = new File([blob], `cuadre-${fecha}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Cuadre ${fechaDMY(fecha)}` });
      } else {
        await descargar();
      }
    } catch {
      /* cancelado */
    } finally {
      setBusy(false);
    }
  }

  const row = (label: string, value: number, strong = false) => (
    <div className={`flex items-center justify-between py-1 text-[0.78rem] ${strong ? "font-semibold text-zinc-800" : "text-zinc-500"}`}>
      <span>{label}</span>
      <span className="tabular-nums text-zinc-800">{formatCOP(value)}</span>
    </div>
  );

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
            className="my-auto w-full max-w-[420px]"
          >
            <div
              ref={ref}
              style={{ fontFamily: "var(--font-ios)" }}
              className="overflow-hidden rounded-[1.1rem] bg-white text-zinc-900"
            >
              <div className="border-b border-zinc-200 px-6 py-4 text-center">
                <p className="text-lg font-bold tracking-tight">Cuadre {fechaDMY(fecha)}</p>
                <p className="mt-0.5 text-[0.7rem] font-medium text-zinc-500">
                  {estado === "cerrado" ? "Día cerrado" : "Día abierto"}
                </p>
              </div>

              <div className="px-6 py-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 text-[0.8rem]">
                  <span className="font-semibold text-zinc-700">Total tirilla</span>
                  <span className="tabular-nums font-semibold">{formatCOP(tirilla)}</span>
                </div>
                {lineas.map((l) => (
                  <div key={l.label} className="flex items-center justify-between py-1 text-[0.78rem]">
                    <span className="text-zinc-500">{l.label}</span>
                    <span className="tabular-nums text-zinc-700">{formatCOP(l.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-[0.8rem]">
                  <span className="font-semibold text-zinc-700">Suma componentes</span>
                  <span className="tabular-nums font-semibold">{formatCOP(suma)}</span>
                </div>
              </div>

              <div
                className="flex items-center justify-between px-6 py-3"
                style={{ background: descuadre ? "#fde2e2" : "#bfe9cb" }}
              >
                <span className="text-sm font-bold tracking-tight text-zinc-800">SALDO FINAL</span>
                <span className="text-base font-bold tabular-nums text-zinc-900">{formatCOP(saldo)}</span>
              </div>

              <div className="border-t border-zinc-200 px-6 py-3">
                <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-wide text-zinc-400">Arqueo de caja</p>
                {row("Efectivo que entró", arqueo.entro)}
                {row("− Retiros", arqueo.retiros)}
                {row("− Préstamos en efectivo", arqueo.prestamosEfectivo)}
                {row("− Compensado", arqueo.compensado)}
                <div className="border-t border-zinc-100">{row("Esperado en caja", arqueo.esperado, true)}</div>
                {row("Efectivo contado", arqueo.contado)}
                <div
                  className="flex items-center justify-between py-1 text-[0.78rem] font-semibold"
                  style={{ color: arqueo.diferencia === 0 ? "#15803d" : "#b91c1c" }}
                >
                  <span>Diferencia</span>
                  <span className="tabular-nums">{formatCOP(arqueo.diferencia)}</span>
                </div>
              </div>

              <div className="px-6 py-2.5 text-center text-[0.62rem] text-zinc-400">
                Multidiagnósticos AS · Corresponsal Bancolombia
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={descargar} disabled={busy} className="basis-full text-white sm:flex-1 sm:basis-0">
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-muted transition-colors hover:text-text"
      >
        <Export size={15} weight="bold" />
        Descargar
      </button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
