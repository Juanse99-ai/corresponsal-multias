import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap select-none transition-transform duration-200 ease-out active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        primary: "text-accent-strong",
        accent: "text-accent-strong",
        secondary: "text-text",
        outline: "text-text",
        ghost: "text-muted hover:text-text",
        danger: "text-danger",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const fill =
      variant === "danger"
        ? "lg-liquid lg-liquid-danger"
        : variant === "secondary" || variant === "outline" || variant === "ghost"
          ? "lg-liquid"
          : "lg-liquid lg-liquid-accent";
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        <span aria-hidden className="lg-liquid-refract pointer-events-none absolute inset-0 z-0 rounded-full" />
        <span aria-hidden className={cn("pointer-events-none absolute inset-0 z-0 rounded-full", fill)} />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
