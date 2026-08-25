import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { addDiasISO, hoyISO, formatFechaCorta } from "@/lib/format";

/** Navegación de días: ‹ [fecha] › + atajo a Hoy. Usa ?fecha= en la URL. */
export function DateNav({ fecha, base }: { fecha: string; base: string }) {
  const prev = addDiasISO(fecha, -1);
  const next = addDiasISO(fecha, 1);
  const hoy = hoyISO();
  const esHoy = fecha === hoy;
  const esFuturoOHoy = fecha >= hoy;
  const cls =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:text-text";

  return (
    <div className="flex items-center gap-1.5">
      <Link href={`${base}?fecha=${prev}`} prefetch={false} className={cls} title="Día anterior" aria-label="Día anterior">
        <CaretLeft size={15} weight="bold" />
      </Link>
      <span className="min-w-[5.5rem] text-center text-[0.82rem] font-medium text-text">
        {esHoy ? "Hoy" : formatFechaCorta(fecha)}
      </span>
      {esFuturoOHoy ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line/50 text-faint/40">
          <CaretRight size={15} weight="bold" />
        </span>
      ) : (
        <Link href={`${base}?fecha=${next}`} prefetch={false} className={cls} title="Día siguiente" aria-label="Día siguiente">
          <CaretRight size={15} weight="bold" />
        </Link>
      )}
      {!esHoy && (
        <Link
          href={base}
          prefetch={false}
          className="ml-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.78rem] font-medium text-accent-strong transition-colors hover:bg-surface-2"
        >
          Hoy
        </Link>
      )}
    </div>
  );
}
