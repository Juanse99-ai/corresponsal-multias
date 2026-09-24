"use client";

import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export interface ChoiceChipProps extends Omit<React.ComponentProps<typeof Toggle>, "pressed" | "onPressedChange"> {
  selected: boolean;
  /** Ícono en reposo; al elegirla se cambia por un chulo. */
  icon?: React.ReactNode;
}

/**
 * Opción elegible en forma de píldora (medio de pago, tipo, etc.), sobre el
 * <Toggle> de shadcn. El estado lo lleva el padre: `selected` + onClick.
 */
export function ChoiceChip({ selected, icon, className, children, ...props }: ChoiceChipProps) {
  return (
    <Toggle
      variant="outline"
      pressed={selected}
      className={cn("text-[0.84rem]", !selected && "text-muted hover:text-foreground", className)}
      {...props}
    >
      {selected ? <Check weight="bold" aria-hidden /> : icon && <span aria-hidden className="inline-flex">{icon}</span>}
      {children}
    </Toggle>
  );
}
