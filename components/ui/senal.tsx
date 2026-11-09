import { cn } from "@/lib/utils";

const PUNTO = {
  ok: "bg-success",
  bad: "bg-danger",
  warn: "bg-[var(--warn-fg)]",
  info: "bg-accent",
  gris: "bg-inerte",
} as const;

/**
 * Señal (Biela, 27 oct 2026): un aviso dentro de un texto («sin soporte»,
 * «vencido», «descuadre de $5.000») es un punto de color de 6 px y la letra
 * gris. Ningún texto va entero en rojo ni en ámbar: el color queda en la señal.
 */
export function Senal({
  tono = "gris",
  className,
  children,
}: {
  tono?: keyof typeof PUNTO;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span data-slot="senal" className={cn("inline-flex items-start gap-1.5 text-muted", className)}>
      <span aria-hidden className={cn("mt-[0.5lh] size-1.5 shrink-0 -translate-y-1/2 rounded-full", PUNTO[tono])} />
      {children}
    </span>
  );
}
