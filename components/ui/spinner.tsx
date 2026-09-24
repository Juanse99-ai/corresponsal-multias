import { cn } from "@/lib/utils"
import { CircleNotch } from "@phosphor-icons/react/dist/ssr"
import type { IconProps } from "@phosphor-icons/react"

function Spinner({ className, ...props }: IconProps) {
  return (
    <CircleNotch
      role="status"
      aria-label="Cargando"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
