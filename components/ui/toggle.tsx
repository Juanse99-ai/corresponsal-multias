"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

// Ficha del estilo del taller: pastilla de 36 (toque de 44 en el celular),
// borde de campo y 12,5/600. La elegida lleva borde y tinta azul sobre azul
// tenue, nunca el azul lleno (ese es el de guardar). `tono` tiñe la elegida
// con su significado (ok, aviso, peligro).
const toggleVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-full border border-borde-campo bg-surface text-meta leading-none font-semibold whitespace-nowrap text-text transition-[color,background-color,border-color,transform] duration-[var(--dur-1)] outline-none select-none after:absolute after:inset-x-0 after:-inset-y-1 hover:border-borde-boton hover:bg-bg-soft active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:pointer-events-none disabled:border-transparent disabled:bg-fill disabled:text-faint aria-invalid:border-destructive data-[state=on]:border-accent data-[state=on]:bg-accent-soft data-[state=on]:font-bold data-[state=on]:text-accent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
      },
      size: {
        default: "h-9 min-w-9 px-3.5",
        sm: "h-9 min-w-9 px-3",
        lg: "h-9 min-w-9 px-4",
      },
      tono: {
        accent: "",
        ok: "data-[state=on]:border-ok-fg data-[state=on]:bg-ok-bg data-[state=on]:text-ok-fg",
        aviso: "data-[state=on]:border-warn-fg data-[state=on]:bg-warn-bg data-[state=on]:text-warn-fg",
        peligro: "data-[state=on]:border-bad-fg data-[state=on]:bg-bad-bg data-[state=on]:text-bad-fg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      tono: "accent",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  tono,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, tono, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
