import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[0.8rem] font-medium text-muted tracking-tight", className)}
      {...props}
    />
  );
}

/** Bloque etiqueta-arriba / input / texto de ayuda o error. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="text-[0.78rem] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[0.78rem] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
