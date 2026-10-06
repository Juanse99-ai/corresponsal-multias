"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Baldosas: una de 3 o 4 opciones con ícono que deciden dónde cae la plata
 * (tipo de movimiento, medio de pago). Rejilla de columnas iguales; la elegida
 * lleva borde azul, fondo azul tenue y un aro. Sobre el ToggleGroup de Radix:
 * las flechas del teclado recorren las opciones y el grupo es una sola parada
 * del Tab. Siempre queda una elegida (tocar la elegida no la suelta).
 */
export function Baldosas({
  value,
  onValueChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive.Root>, "type" | "value" | "defaultValue" | "onValueChange"> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      data-slot="baldosas"
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      className={cn("grid grid-cols-2 gap-2", className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

export function Baldosa({
  icono,
  nombre,
  detalle,
  className,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive.Item>, "children"> & {
  icono: React.ReactNode;
  nombre: React.ReactNode;
  /** Una línea chica debajo del nombre ("Consignación"). */
  detalle?: React.ReactNode;
}) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="baldosa"
      className={cn(
        "group/baldosa flex min-h-[62px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-line bg-surface px-2 py-2.5 text-center text-text transition-[background-color,border-color,box-shadow,transform] duration-[var(--dur-1)] outline-none select-none hover:border-borde-boton hover:bg-bg-soft active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:pointer-events-none disabled:bg-fill disabled:text-faint data-[state=on]:border-accent-fill data-[state=on]:bg-accent-soft data-[state=on]:shadow-[0_0_0_3px_var(--accent-soft)]",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="text-muted group-data-[state=on]/baldosa:text-accent [&_svg]:size-5">
        {icono}
      </span>
      <span className="text-body leading-tight font-semibold">{nombre}</span>
      {detalle && <span className="text-label leading-tight text-faint">{detalle}</span>}
    </ToggleGroupPrimitive.Item>
  );
}
