"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Interruptor de iOS (Biela, 14 oct 2026): 51 × 31, sin borde, verde
        // encendido y gris translúcido apagado; la perilla blanca de 27 no
        // cambia de tamaño y se corre sin rebote.
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent p-px transition-colors duration-[var(--dur-2)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-60 data-[size=default]:h-[31px] data-[size=default]:w-[51px] data-[size=sm]:h-5 data-[size=sm]:w-8 data-[state=checked]:bg-[#34c759] data-[state=unchecked]:bg-[rgba(120,120,128,0.16)] dark:data-[state=checked]:bg-[#30d158] dark:data-[state=unchecked]:bg-[rgba(120,120,128,0.36)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.15),0_0_0_0.5px_rgba(0,0,0,0.04)] ring-0 transition-transform duration-[var(--dur-2)] ease-ios group-data-[size=default]/switch:size-[27px] group-data-[size=sm]/switch:size-4 data-[state=checked]:translate-x-[calc(100%-7px)] group-data-[size=sm]/switch:data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
