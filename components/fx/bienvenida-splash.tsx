"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/brand";
import { formatFechaLarga } from "@/lib/format";
import { saludoHora, mensajePersonal } from "@/lib/saludos";
import { useMontado } from "@/lib/use-montado";

/** ¿Toca mostrarla? Y si cuenta como una de las 2 del día, qué anotar. Solo lee:
 *  la vista se anota en un efecto cuando se muestra. */
function decidirBienvenida(): { mostrar: boolean; anotar?: { key: string; veces: number } } {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bienvenida") === "1") return { mostrar: true };
    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const key = `corr-bienvenida:v2:${hoy}`;
    const veces = Number(localStorage.getItem(key) || "0");
    if (veces >= 2) return { mostrar: false };
    return { mostrar: true, anotar: { key, veces } };
  } catch {
    return { mostrar: true }; // sin localStorage: la mostramos igual
  }
}

/** Bienvenida a pantalla completa sobre la app borrosa: logo, saludo y la fecha (o el
 *  mensaje personal). Primeras 2 veces del día (o forzada con ?bienvenida=1). Se cierra
 *  al tocar. Respeta prefers-reduced-motion. */
export function BienvenidaSplash({ nombre }: { nombre: string }) {
  // Decidir requiere la URL y localStorage, que solo existen en el navegador.
  const montado = useMontado();
  return montado ? <Splash nombre={nombre} /> : null;
}

function Splash({ nombre }: { nombre: string }) {
  const [inicio] = useState(decidirBienvenida);
  const [show, setShow] = useState(inicio.mostrar);
  const root = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();

  // Anota la vista del día (la forzada con ?bienvenida=1 no cuenta).
  useEffect(() => {
    if (!inicio.anotar) return;
    try {
      localStorage.setItem(inicio.anotar.key, String(inicio.anotar.veces + 1));
    } catch {
      /* sin localStorage no se anota */
    }
  }, [inicio]);

  // Con el foco en el aviso, Escape o Enter también lo cierran.
  useEffect(() => {
    if (show) root.current?.focus({ preventScroll: true });
  }, [show]);

  const primer = nombre.split(/\s+/)[0];
  const ahora = new Date();
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(ahora),
  );
  const saludo = saludoHora(hora);
  const linea = mensajePersonal(nombre) ?? formatFechaLarga(hoy);

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          ref={root}
          role="dialog"
          aria-label={`${saludo}, ${primer}`}
          tabIndex={-1}
          onClick={() => setShow(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setShow(false);
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducir ? 0 : 0.35 }}
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
            className="relative flex flex-col items-center gap-4 px-6 text-center"
            initial={{ opacity: 0, y: reducir ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducir ? 0 : 0.45, delay: reducir ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size={64} className="rounded-2xl" />
            <p className="text-[1.75rem] font-semibold tracking-tight text-nav-text sm:text-4xl">
              {saludo}, {primer}
            </p>
            <p className="max-w-[28ch] text-base text-nav-text/75 sm:text-lg">{linea}</p>
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
