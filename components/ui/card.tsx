import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Tarjeta tenue del estilo del taller: 24 px de esquina, borde de luz y
        // sombra suave en Claro; en Noche, solo el borde fino. Relleno de 20 en
        // todos los anchos; nunca una tarjeta dentro de otra.
        "rounded-3xl border border-[var(--tarjeta-borde)] bg-card text-card-foreground shadow-[var(--tarjeta-sombra)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-5 pt-5 pb-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5",
        className
      )}
      {...props}
    />
  )
}

/** Ícono en círculo gris de 32 junto al título de una tarjeta. */
function CardIcono({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="card-icono"
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2 [&_svg]:size-[17px]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Título de tarjeta. Con `icono`, el ícono va antes en un círculo gris (la
 * app lleva un ícono por tarjeta: se reconoce sin leer).
 */
function CardTitle({
  className,
  icono,
  children,
  ...props
}: React.ComponentProps<"div"> & { icono?: React.ReactNode }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-lead font-medium tracking-[-0.3px]",
        icono && "flex min-w-0 items-center gap-2.5",
        className
      )}
      {...props}
    >
      {icono ? (
        <>
          <CardIcono>{icono}</CardIcono>
          <span className="min-w-0 truncate">{children}</span>
        </>
      ) : (
        children
      )}
    </div>
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body text-muted", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 pb-5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 px-5 pb-5 [.border-t]:pt-5", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardIcono,
  CardAction,
  CardDescription,
  CardContent,
}
