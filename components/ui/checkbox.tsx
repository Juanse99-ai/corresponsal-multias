"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "@phosphor-icons/react/dist/ssr"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Casilla del taller: 22 px, esquina 8, blanca con borde de campo; al
        // marcarla se llena del azul de relleno. El toque llega a 44 con el ::after.
        "peer relative size-[22px] shrink-0 rounded-lg border-[1.5px] border-borde-boton bg-blanco transition-colors duration-[var(--dur-1)] outline-none after:absolute after:-inset-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:cursor-not-allowed disabled:border-line disabled:bg-bg-soft aria-invalid:border-destructive data-[state=checked]:border-accent-fill data-[state=checked]:bg-accent-fill data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <Check weight="bold" className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
