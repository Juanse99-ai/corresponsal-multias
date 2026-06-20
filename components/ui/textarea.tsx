import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Área de texto con el lenguaje Liquid Glass de la app: superficie esmerilada,
 * esquinas suaves y un halo de acento al enfocar. Cifras y texto en tono `text`.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-2xl border border-line-strong bg-surface-2/80 px-4 py-3 text-sm text-text",
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
Textarea.displayName = "Textarea";
