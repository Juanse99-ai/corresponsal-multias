"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Contador } from "@/components/ui/contador";
import { cn } from "@/lib/utils";

/**
 * Sección que se abre y se cierra, con un solo dibujo en toda la app: todo el
 * encabezado es el botón (chevron a la izquierda que gira 90°, el título y,
 * debajo, la pista de lo que hay dentro mientras está cerrado), el contador a
 * la derecha y las acciones afuera del botón (nunca un botón dentro de otro).
 * - variante "tarjeta": una tarjeta con su cabecera (título 17/600).
 * - variante "fila": un renglón dentro de otra tarjeta o ventana (13,5/600,
 *   40 de alto; 44 en el celular).
 * El cuerpo crece de alto al abrir (globals.css, .plegable-cuerpo); su relleno
 * lo pone quien lo usa.
 */
export function Plegable({
  titulo,
  pista,
  pistaSiempre = false,
  contador,
  tono,
  acciones,
  variante = "tarjeta",
  abierto,
  onAbiertoChange,
  defaultAbierto = false,
  className,
  children,
}: {
  titulo: React.ReactNode;
  pista?: React.ReactNode;
  /** La pista se ve también abierto. */
  pistaSiempre?: boolean;
  contador?: number | string | null;
  tono?: "aviso" | "peligro";
  acciones?: React.ReactNode;
  variante?: "tarjeta" | "fila";
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
  defaultAbierto?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [local, setLocal] = React.useState(defaultAbierto);
  const controlado = abierto !== undefined;
  const open = controlado ? abierto : local;
  const cambiar = (v: boolean) => {
    if (!controlado) setLocal(v);
    onAbiertoChange?.(v);
  };
  const verPista = pista != null && pista !== "" && pista !== false && (pistaSiempre || !open);
  const tarjeta = variante === "tarjeta";

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={cambiar}
      data-slot="plegable"
      data-variante={variante}
      className={cn(
        tarjeta && "rounded-3xl border border-[var(--tarjeta-borde)] bg-card text-card-foreground shadow-[var(--tarjeta-sombra)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CollapsiblePrimitive.Trigger
          className={cn(
            "group/plegable flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left transition-colors duration-[var(--dur-1)] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid",
            tarjeta
              ? "rounded-3xl px-5 pt-[18px] pb-[18px] hover:bg-bg-soft data-[state=open]:rounded-b-none data-[state=open]:pb-3"
              : "min-h-11 rounded-xl py-1.5 hover:bg-bg-soft lg:min-h-10",
          )}
        >
          <CaretRight
            aria-hidden
            weight="bold"
            className="size-3.5 shrink-0 text-muted transition-transform duration-[var(--dur-2)] ease-ios group-data-[state=open]/plegable:rotate-90"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span
              className={cn(
                "text-text",
                tarjeta ? "text-lead font-semibold tracking-[-0.3px]" : "text-body font-semibold",
              )}
            >
              {titulo}
            </span>
            {verPista && <span className="line-clamp-2 text-meta text-muted">{pista}</span>}
          </span>
          <Contador n={contador} tono={tono} />
        </CollapsiblePrimitive.Trigger>
        {acciones && <div className={cn("flex shrink-0 items-center gap-2", tarjeta && "pr-5")}>{acciones}</div>}
      </div>
      <CollapsiblePrimitive.Content className="plegable-cuerpo overflow-hidden">{children}</CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
