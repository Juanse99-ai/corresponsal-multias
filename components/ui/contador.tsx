import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Contador junto a un título: solo el número ("Registrados 12", no "(12)"),
 * gris. Toma color solo si el número es un estado: `aviso` (ámbar, algo por
 * revisar) o `peligro` (rojo, plata que se debe). Con n == null no pinta nada;
 * el 0 sí se pinta.
 */
export function Contador({
  n,
  tono,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  n: number | string | null | undefined;
  tono?: "aviso" | "peligro";
}) {
  if (n == null) return null;
  return (
    <span
      data-slot="contador"
      className={cn(
        "inline-block shrink-0 rounded-full border border-line bg-bg-soft px-2 py-0.5 text-label leading-[1.4] font-bold whitespace-nowrap text-muted tabular-nums",
        tono === "aviso" && "border-transparent bg-warn-bg text-warn-fg",
        tono === "peligro" && "border-transparent bg-bad-bg text-bad-fg",
        className,
      )}
      {...props}
    >
      {typeof n === "number" ? n.toLocaleString("es-CO") : n}
    </span>
  );
}
