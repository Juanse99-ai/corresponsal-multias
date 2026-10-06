import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { addDiasISO, hoyISO, formatFechaCorta } from "@/lib/format";

/**
 * Navegación de días (guía 8.2): ‹ y › sueltos de 44 con la fecha entre ellos,
 * sin caja ("Hoy" o "lun 5 oct"). Fuera de hoy sale "Hoy" en gris para volver.
 * El día siguiente a hoy no existe: su flecha queda apagada. Usa ?fecha=.
 */
export function DateNav({ fecha, base }: { fecha: string; base: string }) {
  const prev = addDiasISO(fecha, -1);
  const next = addDiasISO(fecha, 1);
  const hoy = hoyISO();
  const esHoy = fecha === hoy;
  const esFuturoOHoy = fecha >= hoy;

  return (
    <nav aria-label="Cambiar de día" className="flex items-center gap-0.5">
      <IconButton label="Día anterior" forma="suelto" asChild>
        <Link href={`${base}?fecha=${prev}`} prefetch={false}>
          <CaretLeft size={20} />
        </Link>
      </IconButton>
      <span className="tnum min-w-[4.75rem] text-center text-title font-semibold text-text">
        {esHoy ? "Hoy" : formatFechaCorta(fecha)}
      </span>
      {esFuturoOHoy ? (
        <IconButton
          label="Día siguiente"
          forma="suelto"
          disabled
          className="disabled:bg-transparent disabled:text-inerte"
        >
          <CaretRight size={20} />
        </IconButton>
      ) : (
        <IconButton label="Día siguiente" forma="suelto" asChild>
          <Link href={`${base}?fecha=${next}`} prefetch={false}>
            <CaretRight size={20} />
          </Link>
        </IconButton>
      )}
      {!esHoy && (
        <Button variant="secondary" size="sm" asChild className="ml-2">
          <Link href={base} prefetch={false}>
            Hoy
          </Link>
        </Button>
      )}
    </nav>
  );
}
