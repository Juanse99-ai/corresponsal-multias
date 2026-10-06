"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { usePastilla } from "@/lib/use-pastilla"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/components/ui/toggle"
import { opcionSegmentado, rielSegmentado } from "@/components/ui/tabs"

/** "segmentado": una de 2 a 5 opciones cortas, en el riel de la opción A. */
type Variante = VariantProps<typeof toggleVariants>["variant"] | "segmentado"
type Tamano = VariantProps<typeof toggleVariants>["size"]
// Omit repartido: el Root de Radix es una unión (single | multiple).
type SinRef<T> = T extends unknown ? Omit<T, "ref"> : never

const ToggleGroupContext = React.createContext<{
  variant?: Variante
  size?: Tamano
  spacing?: number
}>({
  size: "default",
  variant: "default",
  spacing: 0,
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: SinRef<React.ComponentProps<typeof ToggleGroupPrimitive.Root>> & {
  variant?: Variante
  size?: Tamano
  spacing?: number
}) {
  const rielRef = React.useRef<HTMLDivElement>(null)
  usePastilla(rielRef)
  const segmentado = variant === "segmentado"
  return (
    <ToggleGroupPrimitive.Root
      ref={rielRef}
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        segmentado
          ? rielSegmentado
          : "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-full",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: Variante
  size?: Tamano
}) {
  const context = React.useContext(ToggleGroupContext)
  const v = context.variant || variant

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        v === "segmentado"
          ? opcionSegmentado("on")
          : cn(
              toggleVariants({ variant: v, size: context.size || size }),
              "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10"
            ),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
