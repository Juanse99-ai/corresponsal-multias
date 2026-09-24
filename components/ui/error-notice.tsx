"use client";

import { useEffect, useRef } from "react";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { Alert, AlertTitle } from "@/components/ui/alert";

/**
 * Aviso de error estándar: <Alert variant="destructive"> de shadcn con una
 * sacudida (transitions.dev, receta 12) cada vez que llega un mensaje nuevo.
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
      <Warning weight="fill" />
      <AlertTitle className="line-clamp-none font-normal">{message}</AlertTitle>
    </Alert>
  );
}
