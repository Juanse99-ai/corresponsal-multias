import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Botón Liquid Glass "puro": vidrio prácticamente transparente con bisel
 * refractado. A diferencia de <Button> (botón base de la app), este no lleva
 * relleno de color: deja ver el fondo a través. Úsalo en sitios puntuales
 * (sobre imágenes, cabeceras, overlays) donde quieras el efecto cristal.
 */
const liquidButtonVariants = cva(
  "relative inline-flex min-w-fit items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap select-none transition-transform duration-200 ease-out active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      tone: {
        plain: "text-text",
        accent: "text-accent-strong",
        danger: "text-danger",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { tone: "plain", size: "md" },
  },
);

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, tone, size, children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(liquidButtonVariants({ tone, size }), className)} {...props}>
        {/* Capa de refracción real (Firefox); en Chrome/Safari se ignora sin romper. */}
        <span aria-hidden className="lg-liquid-refract pointer-events-none absolute inset-0 z-0 rounded-full" />
        {/* Bisel de vidrio transparente. */}
        <span aria-hidden className="lg-liquid lg-liquid-clear pointer-events-none absolute inset-0 z-0 rounded-full" />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </button>
    );
  },
);
LiquidButton.displayName = "LiquidButton";

export { liquidButtonVariants };
