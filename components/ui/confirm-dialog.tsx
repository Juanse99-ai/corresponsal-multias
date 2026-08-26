"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/format";

export interface ConfirmDialogProps {
  open: boolean;
  titulo: string;
  /** Monto en juego: se muestra grande para que se vea ANTES de decidir. */
  monto?: number | null;
  detalle?: string;
  confirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmación propia para las acciones destructivas. window.confirm se ve como
 * una alerta del sistema (con el dominio arriba) y en la PWA de iOS corta del todo.
 * El foco arranca en Cancelar y Escape cierra.
 */
export function ConfirmDialog({
  open,
  titulo,
  monto,
  detalle,
  confirmar = "Sí, borrar",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancelar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={onCancelar}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-titulo"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[26rem] rounded-[1.25rem] border border-line bg-surface p-5 shadow-[0_20px_50px_-24px_oklch(0.3_0.05_258/0.4)] sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                <Warning size={20} weight="fill" />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-titulo" className="text-[0.98rem] font-semibold tracking-tight text-text">
                  {titulo}
                </h2>
                {detalle && <p className="mt-1 text-[0.85rem] leading-relaxed text-muted">{detalle}</p>}
              </div>
            </div>

            {typeof monto === "number" && (
              <p className="tnum mt-4 text-3xl font-semibold tracking-tight text-text">{formatCOP(monto)}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button ref={cancelRef} variant="secondary" onClick={onCancelar} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="danger" onClick={onConfirmar} className="w-full sm:w-auto">
                {confirmar}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
