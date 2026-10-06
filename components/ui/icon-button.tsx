"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Dónde va el botón:
 * - gris: dentro de tarjetas y filas, círculo gris sin borde.
 * - blanco: acciones de la cabecera de la pantalla (sobre la mesa), círculo
 *   blanco con sombra corta.
 * - suelto: pegado a un título o en una barra (flechas de día, lupa), sin fondo.
 */
const FORMAS = {
  gris: "bg-surface-2 text-text-2 hover:bg-elevated hover:text-text",
  blanco: "bg-blanco text-text-2 shadow-chica hover:bg-bg-soft hover:text-text",
  suelto: "bg-transparent text-muted hover:bg-surface-2 hover:text-text",
} as const;

export interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, "size" | "variant"> {
  /** Qué hace: es el nombre para el lector de pantalla y el texto del tooltip. */
  label: string;
  size?: "icon" | "icon-sm" | "icon-inline";
  forma?: keyof typeof FORMAS;
  /** Borrar: gris en reposo, rojo al pasar el mouse o con el teclado. */
  peligro?: boolean;
  /** De qué lado sale el tooltip (en el riel, a la derecha). */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

/**
 * Botón de solo ícono: <Button> de shadcn con su <Tooltip>. El `label` es
 * obligatorio porque no hay texto visible.
 */
export function IconButton({
  label,
  size = "icon",
  forma = "gris",
  peligro = false,
  className,
  tooltipSide,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          aria-label={label}
          className={cn(
            FORMAS[forma],
            peligro && "text-muted hover:bg-bad-bg hover:text-bad-fg focus-visible:text-bad-fg",
            className,
          )}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}
