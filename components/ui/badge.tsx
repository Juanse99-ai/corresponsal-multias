import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Chip de estado del taller: pastilla 12,5/600 en el par de su estado
// (fondo suave y letra que pasa AA). Es solo lectura: si se toca, es una
// ficha o un botón. Con `punto`, el fondo es gris y el color va solo en un
// punto de 7 px (para listas largas).
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-[5px] text-meta leading-none font-semibold whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // Gris: abierto, sin abrir, el motivo de un préstamo.
        secondary: "bg-surface-2 text-muted",
        destructive: "bg-danger-fill text-accent-ink",
        outline: "border-line text-text [a&]:hover:bg-surface-2",
        ghost: "[a&]:hover:bg-surface-2 [a&]:hover:text-text",
        link: "text-accent underline-offset-4 [a&]:hover:underline",
        // Estados de plata, en su par.
        success: "bg-ok-bg text-ok-fg",
        danger: "bg-bad-bg text-bad-fg",
        warn: "bg-warn-bg text-warn-fg",
        info: "bg-info-bg text-info-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const PUNTO = {
  ok: "bg-success",
  bad: "bg-danger",
  warn: "bg-warn-fg",
  info: "bg-accent",
  gris: "bg-faint",
} as const

function Badge({
  className,
  variant = "default",
  punto,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Chip con punto: fondo gris y el color del estado solo en el punto. */
    punto?: keyof typeof PUNTO
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={punto ? "punto" : variant}
      className={cn(
        badgeVariants({ variant }),
        punto && "bg-surface-2 text-text-2",
        className
      )}
      {...props}
    >
      {punto && <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", PUNTO[punto])} />}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
