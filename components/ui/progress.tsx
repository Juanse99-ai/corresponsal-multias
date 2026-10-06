"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress as ProgressPrimitive } from "radix-ui"

/** Barra de avance de 6 px: pista gris y lleno azul (o verde si ya está al día). */
function Progress({
  className,
  value,
  tono = "accent",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tono?: "accent" | "ok" }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full transition-transform duration-[var(--dur-2)] ease-ios",
          tono === "ok" ? "bg-ok-fill" : "bg-accent"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
