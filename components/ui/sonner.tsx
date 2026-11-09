"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Info, Warning, X } from "@phosphor-icons/react/dist/ssr"
import { Spinner } from "@/components/ui/spinner"
import { HASTA_TABLET as CELULAR } from "@/lib/cortes"

// Avisos como la tarjeta de la app (Biela, 7 oct 2026; el dueño la eligió entre
// cinco): papel, filo y sombra, esquina de 20 y el color solo en el círculo de
// 30 px del ícono, como el encabezado de las ventanas. Verde quedó (con el check
// que se dibuja), azul aviso, rojo no quedó, ámbar ojo. Arriba a la derecha en
// el computador; abajo, cerca del pulgar y encima de la barra, en el celular.
// Las llamadas a toast.*() no cambian.


function suscribir(cambio: () => void) {
  const mq = window.matchMedia(CELULAR)
  mq.addEventListener("change", cambio)
  return () => mq.removeEventListener("change", cambio)
}

function Circulo({ tono, children }: { tono: "ok" | "info" | "warn" | "bad"; children: React.ReactNode }) {
  const color = {
    ok: "bg-ok-bg text-ok-fg",
    info: "bg-info-bg text-info-fg",
    warn: "bg-warn-bg text-warn-fg",
    bad: "bg-bad-bg text-bad-fg",
  }[tono]
  return (
    <span aria-hidden className={`grid size-[30px] shrink-0 place-items-center rounded-full ${color}`}>
      {children}
    </span>
  )
}

// El check se dibuja en 300 ms mientras el aviso entra (globals.css, .aviso-check).
const Check = () => (
  <svg viewBox="0 0 16 16" className="aviso-check size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
)

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
        success: <Circulo tono="ok"><Check /></Circulo>,
        info: <Circulo tono="info"><Info size={17} weight="bold" /></Circulo>,
        warning: <Circulo tono="warn"><Warning size={17} weight="bold" /></Circulo>,
        error: <Circulo tono="bad"><X size={16} weight="bold" /></Circulo>,
        loading: <Circulo tono="info"><Spinner className="size-4" aria-hidden /></Circulo>,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "aviso flex w-fit max-w-full items-center gap-3 rounded-[20px] py-2.5 pr-4 pl-2.5 font-[inherit] text-title leading-[1.35] font-medium text-text",
          icon: "flex shrink-0 items-center",
          content: "min-w-0",
          description: "mt-0.5 text-body font-normal text-muted",
          actionButton:
            "ml-1 h-8 shrink-0 cursor-pointer rounded-full bg-surface-2 px-3.5 text-body font-medium text-text",
          cancelButton: "ml-1 h-8 shrink-0 cursor-pointer rounded-full px-3 text-body font-medium text-muted",
        },
      }}
      style={{ "--width": "380px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
