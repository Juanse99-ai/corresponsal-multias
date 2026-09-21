import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Base común de TODO lo que se toca en la app: forma de píldora, respuesta al
 * presionar, anillo de foco y apagado iguales. Button, IconButton y ChoiceChip
 * la comparten para que ningún botón se sienta distinto a otro.
 */
export const baseInteractiva =
  "relative inline-flex min-w-fit items-center justify-center rounded-full whitespace-nowrap select-none transition-[transform,background-color,color,border-color] duration-200 ease-out active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const buttonVariants = cva(cn(baseInteractiva, "overflow-hidden font-medium"), {
  variants: {
    // Tinta liquid-*: oscura en claro y clara en oscuro, porque el vidrio de
    // .lg-liquid es translúcido y toma el color del fondo.
    variant: {
      // El principal va en semibold: así no se confunde con una opción elegida,
      // que también es azul clara.
      primary: "font-semibold text-liquid-ink-accent",
      accent: "font-semibold text-liquid-ink-accent",
      secondary: "text-liquid-ink",
      outline: "text-liquid-ink",
      ghost: "text-liquid-ink-muted hover:text-liquid-ink",
      danger: "font-semibold text-liquid-ink-danger",
    },
    size: {
      sm: "h-10 px-4 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-6 text-[0.95rem]",
      icon: "h-11 w-11",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, type = "button", ...props }, ref) => {
    const fill =
      variant === "danger"
        ? "lg-liquid lg-liquid-danger"
        : variant === "secondary" || variant === "outline" || variant === "ghost"
          ? "lg-liquid"
          : "lg-liquid lg-liquid-accent";
    return (
      <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        <span aria-hidden className="lg-liquid-refract pointer-events-none absolute inset-0 z-0 rounded-full" />
        <span aria-hidden className={cn("pointer-events-none absolute inset-0 z-0 rounded-full", fill)} />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
