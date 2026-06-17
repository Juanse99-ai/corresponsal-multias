import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[--radius-card] border border-line-strong bg-surface-2 px-3.5 text-text",
        "placeholder:text-faint transition-colors duration-200",
        "focus:outline-none focus:border-accent/60 focus:bg-surface",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
