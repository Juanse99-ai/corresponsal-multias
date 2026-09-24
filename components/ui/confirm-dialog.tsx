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
          <AlertDialogMedia className="size-12 rounded-full bg-danger-soft text-destructive">
            <Warning weight="fill" className="size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {detalle && <AlertDialogDescription>{detalle}</AlertDialogDescription>}
        </AlertDialogHeader>

        {typeof monto === "number" && (
          <p className="tnum text-center text-3xl font-semibold tracking-tight text-foreground sm:text-left">
            {formatCOP(monto)}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
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
