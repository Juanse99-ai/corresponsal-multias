"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNavegacion } from "@/lib/use-navegacion";

/** Si el aviso en vivo no conecta, se revisa cada tanto mientras la pantalla está a la vista. */
const RESPALDO_MS = 20_000;

/**
 * Mantiene la Cuenta del Sr. Luis al día sin recargar (11 nov 2026, lo pidió
 * el dueño): las consignaciones que entran solas desde el grupo de WhatsApp
 * (app/api/agente/comprobante) aparecen apenas se guardan.
 *
 * Escucha en Supabase Realtime los cambios del día en consignaciones,
 * compensaciones y fotos (migración 0007) y refresca la pantalla. También
 * refresca al volver a la app. Si Realtime no conecta, revisa cada 20 s
 * mientras la pantalla está a la vista. No pinta nada.
 */
export function LuisEnVivo({ fecha }: { fecha: string }) {
  const nav = useNavegacion();

  useEffect(() => {
    const sb = createClient();
    let espera: ReturnType<typeof setTimeout> | null = null;
    let respaldo: ReturnType<typeof setInterval> | null = null;

    // Varias filas seguidas (un lote de fotos) se juntan en un solo refresco.
    const refrescar = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => nav.refresh(), 400);
    };
    const filtro = `fecha=eq.${fecha}`;

    const canal = sb
      .channel(`luis-en-vivo-${fecha}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "corr_consignaciones_luis", filter: filtro }, refrescar)
      .on("postgres_changes", { event: "*", schema: "public", table: "corr_compensaciones_luis", filter: filtro }, refrescar)
      .on("postgres_changes", { event: "*", schema: "public", table: "corr_soportes", filter: filtro }, refrescar)
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") {
          if (respaldo) clearInterval(respaldo);
          respaldo = null;
        } else if ((estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") && !respaldo) {
          respaldo = setInterval(() => {
            if (document.visibilityState === "visible") nav.refresh();
          }, RESPALDO_MS);
        }
      });

    // Al volver a la app (otra pestaña, el celular bloqueado) puede haber cosas nuevas.
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      if (espera) clearTimeout(espera);
      if (respaldo) clearInterval(respaldo);
      document.removeEventListener("visibilitychange", alVolver);
      void sb.removeChannel(canal);
    };
  }, [fecha, nav]);

  return null;
}
