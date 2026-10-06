import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Aviso en fila del taller: una fila blanca con borde fino y radio 12, y un
// punto (o el ícono) en el color de lo que pasa a la izquierda. Nunca una
// franja de color a lo ancho.
const alertVariants = cva(
  "group/alert relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border border-line bg-blanco px-3.5 py-2.5 text-body text-text has-[>svg]:grid-cols-[16px_1fr] has-[>svg]:gap-x-2.5 has-[>[data-slot=alert-punto]]:grid-cols-[8px_1fr] has-[>[data-slot=alert-punto]]:gap-x-2.5 [&>svg]:size-4 [&>svg]:translate-y-[2px]",
  {
    variants: {
      variant: {
        default: "[&>svg]:text-accent",
        // Error: el texto en el rojo de letra.
        destructive: "*:data-[slot=alert-title]:font-medium *:data-[slot=alert-title]:text-bad-fg [&>svg]:text-bad-fg",
        // Ojo: algo por revisar.
        warn: "[&>svg]:text-warn-fg",
        success: "[&>svg]:text-ok-fg",
        // Aviso neutro (día cerrado).
        muted: "bg-bg-soft text-text-2 [&>svg]:text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-body text-muted [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

/** Punto de 8 px en el color del aviso, a la izquierda del texto. */
function AlertPunto({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="alert-punto"
      aria-hidden
      className={cn(
        "mt-[6px] size-2 rounded-full bg-accent group-data-[variant=destructive]/alert:bg-danger group-data-[variant=warn]/alert:bg-warn-fg group-data-[variant=success]/alert:bg-success group-data-[variant=muted]/alert:bg-faint",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertPunto }
