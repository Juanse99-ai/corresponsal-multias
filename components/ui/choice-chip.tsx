import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { baseInteractiva } from "@/components/ui/button";

export interface ChoiceChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  /** Ícono opcional. Al elegir la ficha se cambia por el ✓, así no cambia de ancho. */
  icon?: React.ReactNode;
}

/**
 * Ficha para elegir una opción (persona, concepto, medio, filtro). La elegida
 * lleva el vidrio azul y un ✓: el ✓ es lo que la separa del botón de guardar,
 * que también es azul claro.
 */
export const ChoiceChip = React.forwardRef<HTMLButtonElement, ChoiceChipProps>(
  ({ selected, icon, className, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        baseInteractiva,
        "h-10 gap-1.5 border px-4 text-[0.84rem] font-medium",
        selected
          ? "lg-glass-accent border-transparent text-glass-ink-accent"
          : "border-line-strong text-muted hover:border-faint hover:text-text",
        className,
      )}
      {...props}
    >
      {selected ? (
        <Check size={15} weight="bold" aria-hidden className="shrink-0" />
      ) : (
        icon && (
          <span aria-hidden className="inline-flex shrink-0">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  ),
);
ChoiceChip.displayName = "ChoiceChip";
