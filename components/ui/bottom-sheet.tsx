"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "@phosphor-icons/react/dist/ssr";
import { IconButton } from "@/components/ui/icon-button";

/** Mismo corte que la barra de pestañas de abajo (md): por debajo es celular. */
const CELULAR = "(max-width: 767px)";

function suscribir(cb: () => void) {
  const mq = window.matchMedia(CELULAR);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true en celular. En el servidor da false, así el primer HTML es el de escritorio. */
export function useEsCelular(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CELULAR).matches,
    () => false,
  );
}

/**
 * Alto del teclado de iOS. Safari no achica la ventana al abrirlo, solo el
 * visualViewport: sin esto la hoja queda tapada por el teclado.
 */
function useAltoTeclado(activo: boolean): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!activo || !vv) return;
    const medir = () => setAlto(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, [activo]);
  return activo ? alto : 0;
}

// La curva de las hojas de iOS: arranca rápido y se posa sin rebote.
const SUBIR = { duration: 0.42, ease: [0.32, 0.72, 0, 1] } as const;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  /** Contexto corto bajo el título (a quién, cuánto debe...). */
  detalle?: string;
  children: React.ReactNode;
}

/**
 * Hoja que sube desde abajo, como en iOS, para formularios cortos en celular.
 * Se cierra arrastrando la manija hacia abajo, tocando el fondo, con la X o con
 * Escape. Solo la cabecera arrastra: así los campos de adentro se usan normal.
 */
export function BottomSheet({ open, onClose, titulo, detalle, children }: BottomSheetProps) {
  const tituloId = useId();
  const drag = useDragControls();
  const quieto = useReducedMotion();
  const teclado = useAltoTeclado(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Que la página de atrás no se desplace mientras la hoja está abierta.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function soltar(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-text/30 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="hoja"
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={quieto ? { duration: 0 } : SUBIR}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={soltar}
            style={{ bottom: teclado }}
            className="fixed inset-x-0 z-50 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[1.5rem] border border-b-0 border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_-24px_oklch(0.3_0.05_258/0.4)]"
          >
            <div
              onPointerDown={(e) => drag.start(e)}
              className="shrink-0 cursor-grab touch-none px-5 pt-2 pb-3 active:cursor-grabbing"
            >
              <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-line-strong" />
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 pt-1.5">
                  <h2 id={tituloId} className="truncate text-[1.02rem] font-semibold tracking-tight text-text">
                    {titulo}
                  </h2>
                  {detalle && <p className="tnum mt-0.5 text-[0.82rem] text-muted">{detalle}</p>}
                </div>
                <IconButton label="Cerrar" size="sm" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
                  <X size={17} weight="bold" />
                </IconButton>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto px-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
