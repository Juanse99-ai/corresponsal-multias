"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

/** Cada cuánto se pregunta si hay versión nueva, con la app abierta. */
const CADA = 10 * 60 * 1000;

/**
 * La app se instala en el celular y ahí se queda: sin esto, un cambio subido
 * hoy no aparecía hasta que el navegador decidiera soltar su caché. Compara el
 * sello del bundle con el del servidor y ofrece recargar.
 */
export function NuevaVersion() {
  const [hayNueva, setHayNueva] = useState(false);
  const mio = process.env.NEXT_PUBLIC_BUILD_ID;

  const revisar = useCallback(async () => {
    if (!mio || document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const tipo = res.headers.get("content-type") ?? "";
      if (!tipo.includes("application/json")) return; // sesión vencida: llega el login
      const { build } = (await res.json()) as { build?: string };
      if (build && build !== mio) setHayNueva(true);
    } catch {
      /* sin señal: se reintenta en la siguiente vuelta */
    }
  }, [mio]);

  useEffect(() => {
    revisar();
    const id = setInterval(revisar, CADA);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, [revisar]);

  async function actualizar() {
    // El service worker guarda los estáticos; se le pide que busque el nuevo
    // antes de recargar para no volver a caer en lo mismo.
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
    } catch {
      /* sin service worker igual sirve recargar */
    }
    window.location.reload();
  }

  return (
    <AnimatePresence>
      {hayNueva && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-card border border-accent/30 bg-surface px-4 py-3 shadow-lg sm:inset-x-auto sm:right-4"
          role="status"
        >
          <p className="min-w-0 flex-1 text-[0.84rem] text-text">
            Hay una versión nueva de la app.
          </p>
          <Button size="sm" onClick={actualizar} className="shrink-0">
            <ArrowClockwise size={16} weight="bold" />
            Actualizar
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
