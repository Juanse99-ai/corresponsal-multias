import { ArrowsLeftRight, Money, NotePencil } from "@phosphor-icons/react/dist/ssr";
import { ChoiceChip } from "@/components/ui/choice-chip";

export type Medio = "efectivo" | "transferencia" | "registro";

/** El mismo ícono se usa en el formulario y en la fila del préstamo, para que se aprenda. */
export const ICONO_MEDIO: Record<Medio, typeof Money> = {
  efectivo: Money,
  transferencia: ArrowsLeftRight,
  registro: NotePencil,
};

export const NOMBRE_MEDIO: Record<Medio, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  registro: "Solo registro",
};

/**
 * Cómo se entregó la plata de un préstamo. Cada pantalla conserva el orden que
 * ya tenía (en Movimientos va primero Efectivo): cambiarlo provocaría toques
 * equivocados justo en un campo que decide dónde cae la plata.
 */
export function MedioPicker({
  medio,
  onChange,
  labelledBy,
  efectivoPrimero = false,
}: {
  medio: Medio | null;
  onChange: (m: Medio) => void;
  labelledBy?: string;
  efectivoPrimero?: boolean;
}) {
  const pares: Medio[] = efectivoPrimero ? ["efectivo", "transferencia"] : ["transferencia", "efectivo"];
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-2">
      {[...pares, "registro" as const].map((m) => {
        const Icono = ICONO_MEDIO[m];
        return (
          <ChoiceChip
            key={m}
            selected={medio === m}
            onClick={() => onChange(m)}
            icon={<Icono size={15} />}
            className={m === "registro" ? "col-span-2 w-full" : "w-full"}
          >
            {NOMBRE_MEDIO[m]}
          </ChoiceChip>
        );
      })}
    </div>
  );
}
