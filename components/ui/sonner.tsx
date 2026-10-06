"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Spinner } from "@/components/ui/spinner"

// Avisos en pastilla oscura del taller (en los dos temas), con un punto de
// color a la izquierda que dice el resultado antes de leer: verde quedó, azul
// aviso, rojo no quedó, ámbar ojo. El error lleva además su filo rojo
// (globals.css, .aviso). Arriba a la derecha en el computador; abajo, cerca
// del pulgar y encima de la barra, en el celular. Las llamadas a toast.*() no
// cambian.

const CELULAR = "(max-width: 1023px)"

function suscribir(cambio: () => void) {
  const mq = window.matchMedia(CELULAR)
  mq.addEventListener("change", cambio)
  return () => mq.removeEventListener("change", cambio)
}

function Punto({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="block size-[9px] rounded-full"
      style={{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 24%, transparent)` }}
    />
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme()
  const celular = useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CELULAR).matches,
    () => false
  )

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={celular ? "bottom-center" : "top-right"}
      offset={{ top: 18, right: 18, left: 18, bottom: "calc(var(--gbar-sitio) + 4px)" }}
      mobileOffset={{ top: 12, right: 12, left: 12, bottom: "calc(var(--gbar-sitio) + 4px)" }}
      gap={10}
      className="toaster group"
      icons={{
        success: <Punto color="#22c55e" />,
        info: <Punto color="#5b8cff" />,
        warning: <Punto color="#f5a524" />,
        error: <Punto color="#f05252" />,
        loading: <Spinner className="size-4 text-white" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "aviso flex w-fit max-w-full items-center gap-[11px] rounded-3xl py-[11px] pr-[18px] pl-4 font-[inherit] text-title leading-[1.35] font-medium text-white",
          icon: "flex shrink-0 items-center",
          content: "min-w-0",
          description: "mt-0.5 text-body text-white/80",
          actionButton:
            "ml-1 h-8 shrink-0 cursor-pointer rounded-full border border-white/28 bg-white/12 px-3.5 text-body font-semibold text-white",
          cancelButton: "ml-1 h-8 shrink-0 cursor-pointer rounded-full px-3 text-body font-semibold text-white/80",
        },
      }}
      style={{ "--width": "380px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
