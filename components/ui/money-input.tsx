"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { maskMiles, parseMontoInput } from "@/lib/format";
import { Input } from "@/components/ui/input";

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
  onEnter?: () => void;
}

/**
 * Campo de pesos (COP, enteros) sobre el <Input> de shadcn: escribe con puntos
 * de miles mientras se teclea y entrega el número limpio en onValueChange.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, id, name, placeholder = "0", autoFocus, disabled, className, size = "md", onEnter },
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
      <Input
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
        onKeyDown={(e) => {
          if (onEnter && e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onEnter();
          }
        }}
        className={cn(
          "tnum pr-3.5 pl-8 text-right",
          size === "lg" ? "h-14 text-2xl font-semibold" : "h-11 text-base",
          className,
        )}
      />
    </div>
  );
});
