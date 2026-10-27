"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";

/**
 * Lo que una pantalla le pide al navegador: traer sus datos frescos (después de
 * guardar) o ir a otra pantalla. En el computador cada pestaña da su propia
 * versión (components/shell/pestanas.tsx): refrescar trae de nuevo solo esa
 * pestaña e ir cambia esa pestaña. Fuera de las pestañas (celular, tableta) es
 * el router de Next de siempre.
 */
export interface Navegacion {
  refresh: () => void;
  push: (href: string) => void;
}

export const NavegacionCtx = createContext<Navegacion | null>(null);

export function useNavegacion(): Navegacion {
  const router = useRouter();
  const pestana = useContext(NavegacionCtx);
  return useMemo(
    () => pestana ?? { refresh: () => router.refresh(), push: (href: string) => router.push(href) },
    [pestana, router],
  );
}
