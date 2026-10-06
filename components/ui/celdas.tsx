import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Cifras en celdas (guía 8.5): las cifras que se comparan van en una caja
 * partida por filetes, columnas iguales, sin fondo. En el celular, dos
 * columnas con filete entre filas.
 */
function Celdas({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="celdas"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-2xl border border-line lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none",
        // Filetes: a la izquierda de cada celda que no abre fila, y arriba de la
        // segunda fila en el celular.
        "*:border-line max-lg:*:even:border-l max-lg:*:nth-[n+3]:border-t lg:*:not-first:border-l",
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
  className,
}: {
  rotulo: React.ReactNode
  children: React.ReactNode
  /** Debajo de la cifra, en 12,5 gris ("3 consignaciones"). */
  detalle?: React.ReactNode
  /** Resumen de la pantalla: 22 (17 en el celular) en vez de 15. */
  grande?: boolean
  className?: string
}) {
  return (
    <div data-slot="celda" className={cn("flex min-w-0 flex-col gap-1 px-3 py-2.5", className)}>
      <span className="truncate text-meta text-faint">{rotulo}</span>
      <span
        className={cn(
          "tnum truncate font-semibold text-text",
          grande ? "text-lead tracking-[-0.3px] lg:text-h1" : "text-title",
        )}
      >
        {children}
      </span>
      {detalle != null && <span className="truncate text-meta text-muted">{detalle}</span>}
    </div>
  )
}

export { Celdas, Celda }
