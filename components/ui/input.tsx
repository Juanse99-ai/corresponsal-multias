import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
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
      {...props}
    />
  ),
);
Input.displayName = "Input";
