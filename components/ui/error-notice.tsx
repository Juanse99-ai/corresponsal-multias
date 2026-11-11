"use client";

import { useEffect, useRef } from "react";
import { Alert, AlertPunto, AlertTitle } from "@/components/ui/alert";

/**
 * Aviso de error estándar: aviso en fila (<Alert variant="destructive">) con el
 * punto rojo y el texto en el rojo de letra, y una sacudida (transitions.dev,
 * receta 12) cada vez que llega un mensaje nuevo. `demora` (ms) la atrasa
 * cuando algo tapa el aviso al llegar (la pantalla de marca al entrar).
 * Render nulo si no hay mensaje, así el caller lo deja siempre montado.
 */
export function ErrorNotice({
  message,
  className,
  demora = 0,
}: {
  message: string | null;
  className?: string;
  demora?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !message) return;
    // Rearranca la sacudida desde cero aunque el mensaje se repita.
    el.classList.remove("t-shake");
    void el.offsetWidth;
    if (!demora) {
      el.classList.add("t-shake");
      return;
    }
    const espera = setTimeout(() => el.classList.add("t-shake"), demora);
    return () => clearTimeout(espera);
  }, [message, demora]);

  if (!message) return null;

  return (
    <Alert ref={ref} variant="destructive" className={className}>
      <AlertPunto />
      <AlertTitle className="line-clamp-none">{message}</AlertTitle>
    </Alert>
  );
}
