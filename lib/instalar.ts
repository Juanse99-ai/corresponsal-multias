"use client";

import { useSyncExternalStore } from "react";

// "Instalar la app" de la hoja Tú. Chrome y Android avisan con
// `beforeinstallprompt` (se guarda para mostrar su ventana cuando se pida);
// el iPhone no tiene ese aviso: ahí se explica cómo agregarla al inicio.

interface AvisoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let diferido: AvisoInstalar | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

/** Se llama una vez al cargar (components/pwa-register.tsx). */
export function escucharInstalacion() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    diferido = e as AvisoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    diferido = null;
    avisar();
  });
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
}

const instalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const esIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/** `"boton"`: Chrome/Android puede instalarla; `"iphone"`: hay que hacerlo a mano; null: ya está o no se puede. */
export function useInstalar(): { modo: "boton" | "iphone" | null; instalar: () => Promise<void> } {
  const modo = useSyncExternalStore(
    suscribir,
    () => (instalada() ? null : diferido ? "boton" : esIphone() ? "iphone" : null),
    () => null,
  );
  return {
    modo,
    instalar: async () => {
      if (!diferido) return;
      await diferido.prompt();
      await diferido.userChoice;
      diferido = null;
      avisar();
    },
  };
}
