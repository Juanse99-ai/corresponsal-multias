import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Tarjeta navy (guía 8.6): la única cifra de la pantalla sobre la que se
 * aprieta un botón. Es un `Card` con fondo navy; lo de adentro va con los
 * colores de Noche (clase "dark"), así los chips de estado, el segmentado y
 * los botones se ven bien sobre el azul oscuro. En Noche lleva su filo.
 */
function TarjetaNavy({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <Card data-tono="navy" className={cn("border-0 bg-navy p-5 text-white shadow-[var(--navy-filo)]", className)} {...props}>
      <div className="dark sobre-navy flex h-full flex-col">{children}</div>
    </Card>
  )
}

/** Rótulo de la cifra: 12,5/600 en blanco al 55 %. */
function NavyRotulo({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-meta leading-none font-semibold text-white/55", className)} {...props} />
}

/** Fila del desglose: rótulo en blanco al 60 % y cifra blanca tabular. */
function NavyFila({
  rotulo,
  valor,
  fuerte = false,
  negativo = false,
  className,
}: {
  rotulo: React.ReactNode
  valor: React.ReactNode
  fuerte?: boolean
  negativo?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-[7px]", className)}>
      <span className={cn("min-w-0 text-meta", fuerte ? "font-semibold text-white" : "text-white/60")}>{rotulo}</span>
      <span
        className={cn(
          "tnum shrink-0 text-body",
          fuerte ? "font-semibold" : "font-normal",
          negativo ? "text-[#fca5a5]" : "text-white",
        )}
      >
        {valor}
      </span>
    </div>
  )
}

/** Línea entre filas del navy. */
function NavySeparador({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-px bg-white/12", className)} />
}

export { TarjetaNavy, NavyRotulo, NavyFila, NavySeparador }
