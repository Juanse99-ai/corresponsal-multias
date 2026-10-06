import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-2xl border border-transparent bg-campo px-3.5 py-2.5 text-base text-foreground transition-[color,background-color,border-color,box-shadow] duration-[var(--dur-1)] outline-none placeholder:text-faint hover:bg-campo-hover focus-visible:border-accent focus-visible:bg-blanco focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:bg-bg-soft disabled:text-muted aria-invalid:border-destructive aria-invalid:ring-destructive/20 lg:text-body dark:focus-visible:ring-[rgba(76,141,255,0.24)] dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
