import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Cifras en celdas (guía 8.5): las cifras que se comparan van en una caja
 * partida por filetes, columnas iguales, sin fondo. En el celular, dos
 * columnas con filete entre filas. `dos`: dos columnas en todos los anchos
 * (los totales del día van 2 × 2).
 */
function Celdas({ className, dos = false, ...props }: React.ComponentProps<"div"> & { dos?: boolean }) {
  return (
    <div
      data-slot="celdas"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-2xl border border-line *:border-line",
        // Filetes: a la izquierda de cada celda que no abre fila, y arriba de
        // la segunda fila cuando van dos por fila. Si son impares, la última
        // ocupa la fila entera en vez de quedar sola a media fila.
        dos
          ? "*:even:border-l *:nth-[n+3]:border-t *:odd:last:col-span-full"
          : "max-lg:*:even:border-l max-lg:*:nth-[n+3]:border-t max-lg:*:odd:last:col-span-full lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:*:not-first:border-l",
        className
      )}
      {...props}
    />
  )
}

/** Una celda: rótulo de 12,5 arriba, la cifra tabular y, si hace falta, un detalle. */
function Celda({
  rotulo,
  children,
  detalle,
  grande = false,
  tono,
  className,
}: {
  rotulo: React.ReactNode
  children: React.ReactNode
  /** Debajo de la cifra, en 12,5 gris ("3 consignaciones"). */
  detalle?: React.ReactNode
  /** Resumen de la pantalla: 22 (17 en el celular) en vez de 15. */
  grande?: boolean
  /** La cifra en el color de su estado ("Devuelto" en verde). */
  tono?: "ok" | "bad"
  className?: string
}) {
  return (
    <div data-slot="celda" className={cn("flex min-w-0 flex-col gap-1 px-3 py-2.5", className)}>
      <span className="truncate text-meta text-faint">{rotulo}</span>
      <span
        className={cn(
          "tnum truncate font-semibold",
          grande ? "text-lead tracking-[-0.3px] lg:text-h1" : "text-title",
          tono === "ok" ? "text-ok-fg" : tono === "bad" ? "text-bad-fg" : "text-text",
        )}
      >
        {children}
      </span>
      {detalle != null && <span className="truncate text-meta text-muted">{detalle}</span>}
    </div>
  )
}

export { Celdas, Celda }
