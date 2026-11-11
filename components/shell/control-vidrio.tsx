"use client";

import { useSyncExternalStore } from "react";
import { ArrowCounterClockwise, Drop } from "@phosphor-icons/react/dist/ssr";
import { Slider } from "@/components/ui/slider";
import { IconButton } from "@/components/ui/icon-button";
import { VIDRIO_INICIAL, guardarVidrio, leerVidrio, suscribirVidrio } from "@/lib/vidrio";

/**
 * Transparencia del vidrio de la barra de abajo (hoja Tú). Se ve en vivo: la
 * barra queda visible debajo de la hoja mientras se mueve. Se guarda en este
 * teléfono.
 */
export function ControlVidrio() {
  const valor = useSyncExternalStore(suscribirVidrio, leerVidrio, () => VIDRIO_INICIAL);
  return (
    <div className="px-2 pt-1 pb-1.5">
      <div className="flex min-h-11 items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center text-muted">
          <Drop size={21} />
        </span>
        <span className="min-w-0 flex-1 text-body font-medium text-text">Transparencia</span>
        <span className="tnum text-body text-faint">{valor} %</span>
        {valor !== VIDRIO_INICIAL && (
          <IconButton label="Volver a la de fábrica" size="icon-sm" onClick={() => guardarVidrio(VIDRIO_INICIAL)}>
            <ArrowCounterClockwise size={15} weight="bold" />
          </IconButton>
        )}
      </div>
      <Slider
        className="px-1"
        min={0}
        max={100}
        step={1}
        value={[valor]}
        onValueChange={(v) => guardarVidrio(v[0])}
        aria-label="Transparencia del vidrio de la barra"
      />
    </div>
  );
}
