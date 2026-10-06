import * as React from "react"
import { cn } from "@/lib/utils"
import { CaretDown } from "@phosphor-icons/react/dist/ssr"

function NativeSelect({
  className,
  size = "default",
  variante = "campo",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  /** "filtro": pastilla de 36 con borde, para la barra de filtros. */
  variante?: "campo" | "filtro"
}) {
  return (
    <div
      className="group/native-select relative w-fit"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        data-variante={variante}
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-2xl border border-transparent bg-campo px-3.5 py-2 pr-9 text-base text-foreground transition-[color,background-color,border-color,box-shadow] duration-[var(--dur-1)] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted hover:bg-campo-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-muted data-[size=sm]:h-9 data-[size=sm]:py-1 lg:text-body",
          "data-[variante=filtro]:h-9 data-[variante=filtro]:rounded-full data-[variante=filtro]:border-borde-campo data-[variante=filtro]:bg-surface data-[variante=filtro]:py-0 data-[variante=filtro]:text-meta data-[variante=filtro]:hover:border-borde-boton",
          "focus-visible:border-accent focus-visible:bg-blanco focus-visible:ring-[3px] focus-visible:ring-accent-soft dark:focus-visible:ring-[rgba(76,141,255,0.24)]",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      <CaretDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-faint select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
