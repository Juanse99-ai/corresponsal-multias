"use client";

import { useEffect, useRef } from "react";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Aviso de error estándar: banner rojo con sacudida (transitions.dev, receta 12)
 * cada vez que llega un mensaje nuevo. Render nulo si no hay mensaje, así el
 * caller lo deja siempre montado: {<ErrorNotice message={error} />}.
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
    <div
      ref={ref}
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-card border border-danger/30 bg-danger-soft px-3 py-2 text-[0.8rem] text-danger",
        className,
      )}
    >
      <Warning size={15} weight="fill" className="shrink-0" />
      {message}
    </div>
  );
}
