import Link from "next/link";
import { CheckCircle, WarningCircle, Info, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaCorta } from "@/lib/format";
import type { Hallazgo } from "@/lib/auditoria";

/** A dónde lleva cada hallazgo para revisarlo. */
function destino(h: Hallazgo): string {
  return h.tipo === "sin-cuadre" ? `/cuadre?fecha=${h.fecha}` : `/luis?fecha=${h.fecha}`;
}

export function ListaHallazgos({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const graves = hallazgos.filter((h) => h.gravedad === "alta");
  const avisos = hallazgos.filter((h) => h.gravedad === "media");

  if (hallazgos.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <CheckCircle size={22} weight="fill" className="text-success" />
        <p className="text-[0.9rem] font-medium text-text">Sin hallazgos</p>
        <p className="text-[0.8rem] text-muted">
          Ningún registro pasa del tope, no hay duplicados y todos los días tienen su cuadre.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {[
        { titulo: "Revisar", items: graves, grave: true },
        { titulo: "Vale la pena mirar", items: avisos, grave: false },
      ]
        .filter((g) => g.items.length > 0)
        .map((grupo) => (
          <div key={grupo.titulo}>
            <p className="mb-2 text-[0.78rem] font-medium uppercase tracking-wide text-faint">
              {grupo.titulo} · {grupo.items.length}
            </p>
            <Card className="divide-y divide-line p-0">
              {grupo.items.map((h, i) => (
                <Link
                  key={`${h.tipo}-${h.fecha}-${i}`}
                  href={destino(h)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  {grupo.grave ? (
                    <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-danger" />
                  ) : (
                    <Info size={17} weight="fill" className="mt-0.5 shrink-0 text-faint" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[0.88rem] font-medium text-text">{h.titulo}</span>
                      <span className="text-[0.74rem] text-faint">{formatFechaCorta(h.fecha)}</span>
                      {h.monto !== null && (
                        <span className={cn("tnum text-[0.82rem] font-medium", grupo.grave ? "text-danger" : "text-text")}>
                          {formatCOP(h.monto)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[0.76rem] leading-snug text-muted">{h.detalle}</span>
                  </span>
                  <CaretRight size={14} className="mt-1 shrink-0 text-faint" />
                </Link>
              ))}
            </Card>
          </div>
        ))}
    </div>
  );
}
