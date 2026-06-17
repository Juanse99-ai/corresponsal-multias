"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { maskMiles, parseMontoInput } from "@/lib/format";

interface MoneyInputProps {
  value: number;
  onValueChange: (n: number) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "md" | "lg";
}

/** Input de pesos con mascara de miles en vivo y prefijo $. Alinea a la derecha. */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, id, name, placeholder = "0", autoFocus, disabled, className, size = "md" },
  ref,
) {
  const display = value ? maskMiles(String(value)) : "";
  return (
    <div className="relative flex items-center">
      <span
        className={cn(
          "pointer-events-none absolute left-3.5 text-faint tnum",
          size === "lg" ? "text-lg" : "text-sm",
        )}
      >
        $
      </span>
      <input
        ref={ref}
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        value={display}
        placeholder={placeholder}
        onChange={(e) => onValueChange(parseMontoInput(e.target.value))}
        className={cn(
          "tnum w-full rounded-[--radius-card] border border-line-strong bg-surface-2 pr-3.5 pl-8 text-right text-text",
          "placeholder:text-faint transition-colors duration-200",
          "focus:outline-none focus:border-accent/60 focus:bg-surface",
          "disabled:opacity-50 disabled:pointer-events-none",
          size === "lg" ? "h-14 text-2xl font-semibold" : "h-11 text-base",
          className,
        )}
      />
    </div>
  );
});
