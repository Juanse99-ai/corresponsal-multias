"use client";

import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Toggle } from "@/components/ui/toggle";

export interface ChoiceChipProps extends Omit<React.ComponentProps<typeof Toggle>, "pressed" | "onPressedChange"> {
  selected: boolean;
  /** Ícono en reposo; al elegirla se cambia por un chulo. */
  icon?: React.ReactNode;
}

/**
 * Ficha para elegir (filtros, personas, motivos), sobre el <Toggle> de shadcn.
 * La elegida se ve elegida pero nunca como el botón azul lleno. El estado lo
 * lleva el padre: `selected` + onClick. `tono` tiñe la elegida (ok, aviso,
 * peligro) cuando la opción es un estado.
 */
export function ChoiceChip({ selected, icon, children, ...props }: ChoiceChipProps) {
  return (
    <Toggle pressed={selected} {...props}>
      {selected ? <Check weight="bold" aria-hidden /> : icon && <span aria-hidden className="inline-flex">{icon}</span>}
      {children}
    </Toggle>
  );
}
