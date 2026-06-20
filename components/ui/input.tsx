import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Se dispara al presionar Enter (sin composición IME). Útil para enviar el formulario. */
  onEnter?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, onEnter, onKeyDown, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-line-strong bg-surface-2/80 px-3.5 text-text",
        "placeholder:text-faint shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]",
        "transition-[color,background-color,border-color,box-shadow] duration-200",
        "focus:outline-none focus:border-accent/60 focus:bg-surface",
        "focus:shadow-[0_0_0_3px_oklch(0.515_0.172_258/0.12),inset_0_1px_0_oklch(1_0_0/0.7)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (onEnter && e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnter();
        }
      }}
      {...props}
    />
  ),
);
Input.displayName = "Input";
