import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Campo relleno (estilo del taller): gris suave sin borde; al escribir
        // se vuelve blanco con el aro azul.
        "h-11 w-full min-w-0 rounded-2xl border border-transparent bg-campo px-3.5 py-1 text-base text-foreground transition-[color,background-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-faint hover:bg-campo-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:bg-blanco focus-visible:ring-[3px] focus-visible:ring-ring/20 dark:focus-visible:ring-ring/30",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
