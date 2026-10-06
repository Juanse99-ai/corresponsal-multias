"use client";

import { Warning } from "@phosphor-icons/react/dist/ssr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCOP } from "@/lib/format";

export interface ConfirmDialogProps {
  open: boolean;
  titulo: string;
  /** Monto en juego: se muestra grande para que se vea ANTES de decidir. */
  monto?: number | null;
  detalle?: string;
  confirmar?: string;
  /** "bad" (por defecto) borra: círculo y botón rojos. "warn" no borra nada
   *  pero conviene mirar (cerrar un día descuadrado): círculo ámbar y la
   *  acción en azul. */
  tono?: "bad" | "warn";
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmación de las acciones destructivas, con el <AlertDialog> de shadcn.
 * window.confirm se ve como una alerta del sistema y en la PWA de iOS falla.
 * El foco arranca en Cancelar y Escape cierra (lo hace Radix).
 */
export function ConfirmDialog({
  open,
  titulo,
  monto,
  detalle,
  confirmar = "Sí, borrar",
  tono = "bad",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(abierto) => !abierto && onCancelar()}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          // Enfocar Cancelar, no la acción destructiva.
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-slot=alert-dialog-cancel]")?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className={tono === "bad" ? "bg-bad-bg text-bad-fg" : "bg-warn-bg text-warn-fg"}>
            <Warning weight="fill" />
          </AlertDialogMedia>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {detalle && <AlertDialogDescription>{detalle}</AlertDialogDescription>}
        </AlertDialogHeader>

        {typeof monto === "number" && (
          <p className="tnum text-kpi font-semibold tracking-[-0.6px] text-text">
            {formatCOP(monto)}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={tono === "bad" ? "destructive" : "default"}
            onClick={(e) => {
              // Sin esto Radix cierra solo y dispara también onCancelar.
              e.preventDefault();
              onConfirmar();
            }}
          >
            {confirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
