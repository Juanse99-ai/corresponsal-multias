"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { usePastilla } from "@/lib/use-pastilla"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

/** Clases del riel de un segmentado (opción A): Tabs y ToggleGroup. */
const rielSegmentado =
  "segmentado relative isolate inline-flex w-fit max-w-full items-center gap-[3px] rounded-full bg-riel p-[3px] shadow-[var(--riel-sombra)]"

/** Clases de una opción del riel; `on` es el atributo de la elegida. */
function opcionSegmentado(on: "active" | "on") {
  return cn(
    "relative inline-flex h-[38px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-body font-medium whitespace-nowrap text-riel-tinta transition-[color,transform] duration-[var(--dur-1)] outline-none select-none hover:text-text active:scale-[0.96] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:pointer-events-none disabled:text-faint lg:h-[34px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    on === "active"
      ? "data-[state=active]:bg-riel-on data-[state=active]:font-semibold data-[state=active]:text-riel-on-tinta data-[state=active]:shadow-riel-on"
      : "data-[state=on]:bg-riel-on data-[state=on]:font-semibold data-[state=on]:text-riel-on-tinta data-[state=on]:shadow-riel-on"
  )
}

/**
 * Riel de pestañas: segmentado opción A (el riel hundido y más oscuro que la
 * página, la elegida en pastilla blanca que viaja). Si no caben, el riel se
 * desliza de lado en el celular.
 */
function TabsList({
  className,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.List>, "ref">) {
  const rielRef = React.useRef<HTMLDivElement>(null)
  usePastilla(rielRef)
  return (
    <TabsPrimitive.List
      ref={rielRef}
      data-slot="tabs-list"
      className={cn(rielSegmentado, className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(opcionSegmentado("active"), className)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, rielSegmentado, opcionSegmentado }
