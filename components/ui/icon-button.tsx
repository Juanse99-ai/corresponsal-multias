import * as React from "react";
import { cn } from "@/lib/utils";
import { baseInteractiva } from "@/components/ui/button";

type Tono = "plain" | "danger" | "accent";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Qué hace. Es obligatorio: sin texto visible, esto es lo que oye el lector de pantalla y sale al pasar el mouse. */
  label: string;
  tone?: Tono;
  /** md = 44 px (dedo cómodo). sm = 36 px, solo donde el espacio no da. */
  size?: "sm" | "md";
}

const TONO: Record<Tono, string> = {
  plain: "text-muted hover:text-text",
  // Neutro en reposo: una lista llena de papeleras rojas asusta. Rojo al tocar.
  danger: "text-muted hover:text-danger active:text-danger",
  accent: "text-accent-strong",
};

/**
 * Botón de solo ícono (editar, borrar, cerrar...). Círculo de vidrio casi
 * transparente, de la misma familia que <Button>, para que las acciones de una
 * fila no pesen tanto como el botón principal del formulario.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tone = "plain", size = "md", className, children, type = "button", title, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        baseInteractiva,
        "shrink-0 overflow-hidden",
        size === "md" ? "h-11 w-11" : "h-9 w-9",
        TONO[tone],
        className,
      )}
      {...props}
    >
      <span aria-hidden className="lg-liquid lg-liquid-clear pointer-events-none absolute inset-0 z-0 rounded-full" />
      <span className="relative z-10 inline-flex items-center justify-center">{children}</span>
    </button>
  ),
);
IconButton.displayName = "IconButton";
