"use client";

import { useEffect } from "react";
import { bloquear } from "@/app/caja/actions";
import { MINUTOS_BLOQUEO } from "@/lib/caja-cookie";

/**
 * En un equipo autorizado (caja), tras MINUTOS_BLOQUEO sin tocar nada la app se
 * bloquea y vuelve a la pantalla de clave. También al volver a la app después
 * de tenerla escondida ese tiempo (el reloj se para con el teléfono dormido).
 * Es el aviso rápido en pantalla: quien de verdad cierra la sesión si se cerró
 * la pestaña es el proxy (lib/supabase/middleware.ts, cookie corr_caja_uso).
 */
export function useBloqueoInactivo(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const ms = MINUTOS_BLOQUEO * 60_000;
    let reloj = 0;
    let escondidaDesde = 0;
    const reiniciar = () => {
      clearTimeout(reloj);
      reloj = window.setTimeout(() => void bloquear(), ms);
    };
    const alCambiarVista = () => {
      if (document.hidden) escondidaDesde = Date.now();
      else if (escondidaDesde && Date.now() - escondidaDesde >= ms) void bloquear();
      else reiniciar();
    };
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    document.addEventListener("visibilitychange", alCambiarVista);
    reiniciar();
    return () => {
      clearTimeout(reloj);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
      document.removeEventListener("visibilitychange", alCambiarVista);
    };
  }, [activo]);
}
