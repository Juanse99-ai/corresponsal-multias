import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Campo relleno (estilo del taller): gris suave sin borde; al escribir
        // se vuelve blanco con borde y aro azul. Letra de 16 en el celular
        // (con menos, iOS acerca la pantalla) y 13,5 en el computador.
        // Apagado: gris de apoyo y letra gris, nunca transparente.
        "h-11 w-full min-w-0 rounded-2xl border border-transparent bg-campo px-3.5 py-1 text-base text-foreground transition-[color,background-color,border-color,box-shadow] duration-[var(--dur-1)] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground placeholder:text-faint hover:bg-campo-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-muted lg:text-body",
        "focus-visible:border-accent focus-visible:bg-blanco focus-visible:ring-[3px] focus-visible:ring-accent-soft dark:focus-visible:ring-[rgba(76,141,255,0.24)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
