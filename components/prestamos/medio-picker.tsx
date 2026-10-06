import { ArrowsLeftRight, Money, NotePencil } from "@phosphor-icons/react/dist/ssr";
import { Baldosas, Baldosa } from "@/components/ui/baldosas";

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
 * Cómo se entregó la plata de un préstamo, en tres baldosas. Cada pantalla
 * conserva el orden que ya tenía (en Movimientos va primero Efectivo):
 * cambiarlo provocaría toques equivocados justo en un campo que decide dónde
 * cae la plata. Sin premarcar: mientras no se elige, ninguna va elegida.
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
    <Baldosas
      value={medio ?? ""}
      onValueChange={(v) => onChange(v as Medio)}
      aria-labelledby={labelledBy}
      className="grid-cols-3"
    >
      {[...pares, "registro" as const].map((m) => {
        const Icono = ICONO_MEDIO[m];
        return <Baldosa key={m} value={m} icono={<Icono />} nombre={NOMBRE_MEDIO[m]} />;
      })}
    </Baldosas>
  );
}
