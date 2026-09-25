"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { formatFechaLarga } from "@/lib/format";
import { useMontado } from "@/lib/use-montado";

const VERDE = "oklch(0.585 0.13 155)";

/** Aviso al cerrar el día: si quedó cuadrado, un check que se dibuja; si no, un
 *  candado. Se queda hasta que la persona toca o presiona una tecla. */
export function CelebracionCierre({ play, fecha, cuadrado }: { play: number; fecha: string; cuadrado: boolean }) {
  // El portal va a document.body, que no existe en el servidor.
  const montado = useMontado();
  // Cada cierre sube `play`; el aviso se ve hasta que se cierra ese mismo cierre.
  const [visto, setVisto] = useState(0);
  const abierto = play > 0 && play !== visto;
  const root = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();

  useEffect(() => {
    if (abierto) root.current?.focus({ preventScroll: true });
  }, [abierto]);

  if (!montado) return null;

  const cerrar = () => setVisto(play);
  const dibujo = (delay: number, duration: number) => ({
    initial: { pathLength: reducir ? 1 : 0 },
    animate: { pathLength: 1 },
    transition: { duration: reducir ? 0 : duration, delay: reducir ? 0 : delay, ease: "easeOut" as const },
  });

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={root}
          role="dialog"
          aria-label="Día cerrado"
          tabIndex={-1}
          onClick={cerrar}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") cerrar();
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducir ? 0 : 0.3 }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "oklch(0.16 0.02 265 / 0.82)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          />
          <motion.div
            className="relative flex flex-col items-center gap-3.5 px-8 text-center"
            initial={{ opacity: 0, y: reducir ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducir ? 0 : 0.4, delay: reducir ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {cuadrado ? (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-success-soft">
                <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden>
                  <motion.circle cx="50" cy="50" r="42" fill="none" stroke={VERDE} strokeWidth="5" strokeLinecap="round" {...dibujo(0.15, 0.5)} />
                  <motion.path
                    d="M30 51 L44 65 L71 35"
                    fill="none"
                    stroke={VERDE}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...dibujo(0.6, 0.32)}
                  />
                </svg>
              </span>
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[oklch(0.4_0.08_265/0.4)] text-nav-text/90">
                <LockSimple size={38} weight="fill" />
              </span>
            )}
            <p className="text-2xl font-semibold tracking-tight text-nav-text sm:text-3xl">Día cerrado</p>
            <p className="text-[0.95rem] text-nav-text/80">
              {cuadrado ? "Quedó cuadrado." : "Quedó con diferencia. Revísalo mañana."}
            </p>
            <p className="text-[0.82rem] text-nav-text/55">{formatFechaLarga(fecha)}</p>
          </motion.div>
          <p
            className="pointer-events-none absolute inset-x-0 bottom-9 text-center text-[0.82rem] text-nav-text/55"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            Toca para continuar
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
