"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "@phosphor-icons/react/dist/ssr"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("velo fixed inset-0 z-50", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Ventana del estilo del taller: sin filetes, fondo blanco (en Noche,
          // apenas más claro que el negro); entra creciendo desde 0,95. En el
          // celular es una hoja que sube desde abajo con su agarradera. Las
          // animaciones están en globals.css (.ventana).
          "ventana fixed top-[50%] left-[50%] z-50 grid max-h-[90vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto overscroll-contain rounded-3xl border-0 bg-blanco p-[22px] shadow-ventana outline-none sm:max-w-lg",
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92vh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:px-[18px] max-sm:pt-[26px] max-sm:pb-[calc(18px+env(safe-area-inset-bottom,0px))]",
          "max-sm:before:absolute max-sm:before:top-2 max-sm:before:left-1/2 max-sm:before:h-[5px] max-sm:before:w-[38px] max-sm:before:-translate-x-1/2 max-sm:before:rounded max-sm:before:bg-fill-2",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-[18px] right-[18px] grid size-9 place-items-center rounded-full text-muted transition-colors duration-[var(--dur-1)] outline-none after:absolute after:-inset-1 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid disabled:pointer-events-none max-sm:top-[18px] max-sm:right-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]"
          >
            <X />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** Color del círculo del ícono: lo que pasa (azul), bien, cuidado o mal. */
const TONO_ICONO = {
  info: "bg-accent-soft-2 text-accent",
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  bad: "bg-bad-bg text-bad-fg",
} as const

/** Círculo de 44 px (40 en el celular) con el ícono de la ventana. */
function DialogIcon({
  className,
  tono = "info",
  ...props
}: React.ComponentProps<"div"> & { tono?: keyof typeof TONO_ICONO }) {
  return (
    <div
      data-slot="dialog-icon"
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full sm:size-11 [&_svg:not([class*='size-'])]:size-[21px]",
        TONO_ICONO[tono],
        className
      )}
      {...props}
    />
  )
}

/**
 * Cabecera de la ventana. Con `icono`, el círculo de color va a la izquierda
 * del título y la descripción (estilo del taller).
 */
function DialogHeader({
  className,
  icono,
  tono,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icono?: React.ReactNode
  tono?: keyof typeof TONO_ICONO
}) {
  if (icono) {
    return (
      <div
        data-slot="dialog-header"
        className={cn("flex items-start gap-3.5 pr-8 text-left", className)}
        {...props}
      >
        <DialogIcon tono={tono}>{icono}</DialogIcon>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-px">{children}</div>
      </div>
    )
  }
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 pr-8 text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Botones a la derecha; en el celular, en fila y a lo ancho.
        "flex flex-row justify-end gap-2.5 pt-1.5 max-sm:*:flex-1",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="secondary">Cerrar</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lead font-semibold tracking-[-0.2px] sm:text-h1 sm:tracking-[-0.4px]", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body text-muted", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
