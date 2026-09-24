"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** Cada cuánto se pregunta si hay versión nueva, con la app abierta. */
const CADA = 10 * 60 * 1000;

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

/**
 * La app se instala en el celular y ahí se queda: sin esto, un cambio subido
 * hoy no aparecía hasta que el navegador decidiera soltar su caché. Compara el
 * sello del bundle con el del servidor y ofrece recargar con un aviso de sonner
 * que se queda fijo hasta que se actualice.
 */
export function NuevaVersion() {
  const avisado = useRef(false);
  const mio = process.env.NEXT_PUBLIC_BUILD_ID;

  const revisar = useCallback(async () => {
    if (avisado.current || !mio || document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const tipo = res.headers.get("content-type") ?? "";
      if (!tipo.includes("application/json")) return; // sesión vencida: llega el login
      const { build } = (await res.json()) as { build?: string };
      if (build && build !== mio) {
        avisado.current = true;
        toast("Hay una versión nueva de la app.", {
          id: "nueva-version",
          duration: Infinity,
          // Como antes: no se puede descartar, solo actualizar.
          dismissible: false,
          closeButton: false,
          action: {
            label: "Actualizar",
            onClick: (e) => {
              e.preventDefault(); // el aviso sigue a la vista mientras recarga
              void actualizar();
            },
          },
        });
      }
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

  return null;
}
