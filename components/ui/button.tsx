import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[--radius-card] font-medium whitespace-nowrap transition-all duration-200 ease-out active:translate-y-px active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_8px_18px_-10px_oklch(0.515_0.172_258/0.55)]",
        accent: "bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_8px_18px_-10px_oklch(0.515_0.172_258/0.55)]",
        secondary: "bg-surface text-text border border-line-strong hover:bg-surface-2",
        outline: "border border-line-strong text-text hover:bg-surface-2",
        ghost: "text-muted hover:text-text hover:bg-surface-2",
        danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
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
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
