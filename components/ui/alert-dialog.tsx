"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useArrastrarHoja } from "@/lib/use-arrastrar-hoja"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("velo fixed inset-0 z-50", className)}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  onTouchStart,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
}) {
  // En el celular la hoja se arrastra hacia abajo; Escape pasa por Cancelar.
  const arrastre = useArrastrarHoja()
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          // Confirmación del taller: la misma ventana, más compacta (440 px);
          // en el celular, hoja con agarradera. Tocar afuera no la cierra.
          "ventana group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid max-h-[90vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-[18px] overflow-y-auto overscroll-contain rounded-3xl border-0 bg-blanco p-6 shadow-ventana outline-none data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-[440px]",
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92vh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:px-[18px] max-sm:pt-[26px] max-sm:pb-[calc(18px+env(safe-area-inset-bottom,0px))] max-sm:data-[size=sm]:max-w-none",
          "max-sm:before:absolute max-sm:before:top-2 max-sm:before:left-1/2 max-sm:before:h-[5px] max-sm:before:w-[38px] max-sm:before:-translate-x-1/2 max-sm:before:rounded max-sm:before:bg-fill-2",
          className
        )}
        onTouchStart={(e) => {
          onTouchStart?.(e)
          arrastre.onTouchStart(e)
        }}
        onPointerDown={(e) => {
          onPointerDown?.(e)
          arrastre.onPointerDown(e)
        }}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        // Círculo a la izquierda; título y texto a su lado, alineados a la izquierda.
        "grid grid-rows-[auto_1fr] place-items-start gap-x-3.5 gap-y-1 text-left has-data-[slot=alert-dialog-media]:grid-cols-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        // Cancelar gris y la acción, a la derecha; en el celular a lo ancho.
        "flex flex-row justify-end gap-2.5 max-sm:*:flex-1 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-lead font-semibold tracking-[-0.2px] group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2 sm:text-h1 sm:tracking-[-0.4px]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-body text-muted group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2", className)}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        // Círculo de 44 px (40 en el celular) en el color de lo que pasa.
        "row-span-2 inline-flex size-10 items-center justify-center rounded-full bg-accent-soft-2 text-accent sm:size-11 *:[svg:not([class*='size-'])]:size-[21px]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  // Cancelar en gris relleno, sin borde.
  variant = "secondary",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
