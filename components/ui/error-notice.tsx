"use client";

import { useEffect, useRef } from "react";
import { Alert, AlertPunto, AlertTitle } from "@/components/ui/alert";

/**
 * Aviso de error estándar: aviso en fila (<Alert variant="destructive">) con el
 * punto rojo y el texto en el rojo de letra, y una sacudida (transitions.dev,
 * receta 12) cada vez que llega un mensaje nuevo.
 * Render nulo si no hay mensaje, así el caller lo deja siempre montado.
 */
export function ErrorNotice({ message, className }: { message: string | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !message) return;
    // Rearranca la sacudida desde cero aunque el mensaje se repita.
    el.classList.remove("t-shake");
    void el.offsetWidth;
    el.classList.add("t-shake");
  }, [message]);

  if (!message) return null;

  return (
    <Alert ref={ref} variant="destructive" className={className}>
      <AlertPunto />
      <AlertTitle className="line-clamp-none">{message}</AlertTitle>
    </Alert>
  );
}
