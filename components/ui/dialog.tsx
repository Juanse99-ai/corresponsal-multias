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
      className={cn(
        "fixed inset-0 z-50 bg-velo backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
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
          // apenas más claro que el negro) y entra creciendo desde 0,95.
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[1.5rem] border-0 bg-blanco p-[22px] shadow-[0_24px_60px_-20px_rgba(15,35,80,0.35)] duration-[280ms] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-surface-2 data-[state=open]:text-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
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
  info: "bg-accent-soft text-accent",
  ok: "bg-success-soft text-success",
  warn: "bg-danger-soft/60 text-danger",
  bad: "bg-danger-soft text-danger",
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
        "grid size-10 shrink-0 place-items-center rounded-full sm:size-11 [&_svg:not([class*='size-'])]:size-5",
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
        className={cn("flex items-start gap-3.5 text-left", className)}
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
      className={cn("flex flex-col gap-1 text-center sm:text-left", className)}
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
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
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
      className={cn("text-[17px] leading-tight font-semibold tracking-[-0.2px] sm:text-[22px] sm:tracking-[-0.4px]", className)}
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
      className={cn("text-[13.5px] text-muted", className)}
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
