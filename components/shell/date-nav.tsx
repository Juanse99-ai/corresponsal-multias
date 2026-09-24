import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { IconButton } from "@/components/ui/icon-button";
import { addDiasISO, hoyISO, formatFechaCorta } from "@/lib/format";

/** Navegación de días: ‹ [fecha] › + atajo a Hoy. Usa ?fecha= en la URL. */
export function DateNav({ fecha, base }: { fecha: string; base: string }) {
  const prev = addDiasISO(fecha, -1);
  const next = addDiasISO(fecha, 1);
  const hoy = hoyISO();
  const esHoy = fecha === hoy;
  const esFuturoOHoy = fecha >= hoy;
  const flecha = "size-9 text-muted hover:text-text";

  return (
    <div className="flex items-center gap-2.5">
      <ButtonGroup aria-label="Cambiar de día">
        <IconButton label="Día anterior" variant="outline" size="icon-sm" className={flecha} asChild>
          <Link href={`${base}?fecha=${prev}`} prefetch={false}>
            <CaretLeft size={15} weight="bold" />
          </Link>
        </IconButton>
        <ButtonGroupText className="min-w-[5.5rem] justify-center bg-background px-3 text-[0.82rem] text-text shadow-xs">
          {esHoy ? "Hoy" : formatFechaCorta(fecha)}
        </ButtonGroupText>
        {esFuturoOHoy ? (
          <Button variant="outline" size="icon-sm" disabled aria-label="Día siguiente" className={flecha}>
            <CaretRight size={15} weight="bold" />
          </Button>
        ) : (
          <IconButton label="Día siguiente" variant="outline" size="icon-sm" className={flecha} asChild>
            <Link href={`${base}?fecha=${next}`} prefetch={false}>
              <CaretRight size={15} weight="bold" />
            </Link>
          </IconButton>
        )}
      </ButtonGroup>
      {!esHoy && (
        <Button variant="outline" size="xs" asChild className="h-9 text-[0.78rem] text-accent-strong">
          <Link href={base} prefetch={false}>
            Hoy
          </Link>
        </Button>
      )}
    </div>
  );
}
