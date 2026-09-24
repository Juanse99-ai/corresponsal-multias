"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, "size"> {
  /** Qué hace: es el nombre para el lector de pantalla y el texto del tooltip. */
  label: string;
  size?: "icon" | "icon-sm" | "icon-lg";
}

/**
 * Botón de solo ícono: <Button variant="ghost"> de shadcn con su <Tooltip>.
 * El `label` es obligatorio porque no hay texto visible.
 */
export function IconButton({ label, variant = "ghost", size = "icon", className, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size={size} aria-label={label} className={className} {...props} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
