import { Fragment } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle, Info } from "@phosphor-icons/react/dist/ssr";
import { Cajon } from "@/components/ui/plegable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Contador } from "@/components/ui/contador";
import {
  ItemGroup,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { FlechaFila } from "@/components/ui/flecha-fila";
import { formatCOP, formatDia } from "@/lib/format";
import type { Hallazgo } from "@/lib/auditoria";

/** A dónde lleva cada hallazgo para revisarlo. */
function destino(h: Hallazgo): string {
  return h.tipo === "sin-cuadre" ? `/cuadre?fecha=${h.fecha}` : `/luis?fecha=${h.fecha}`;
}

export function ListaHallazgos({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const graves = hallazgos.filter((h) => h.gravedad === "alta");
  const avisos = hallazgos.filter((h) => h.gravedad === "media");

  // El único vacío que se celebra: todo revisado y en orden.
  if (hallazgos.length === 0) {
    return (
      <Card className="p-5">
        <p className="flex items-start gap-2 rounded-lg bg-ok-bg px-3 py-2.5 text-meta text-ok-fg">
          <CheckCircle size={15} weight="fill" className="mt-px shrink-0" />
          <span>
            <span className="font-medium">Sin hallazgos.</span> Ningún registro pasa del tope, no hay duplicados y
            todos los días tienen su cuadre.
          </span>
        </p>
      </Card>
    );
  }

  // Un cajón por gravedad (Biela, «Cajones que se recogen»).
  return (
    <div className="flex flex-col gap-5">
      {[
        { titulo: "Revisar", items: graves, grave: true },
        { titulo: "Vale la pena mirar", items: avisos, grave: false },
      ]
        .filter((g) => g.items.length > 0)
        .map((grupo) => (
          <Cajon
            key={grupo.titulo}
            pantalla="auditoria"
            id={grupo.grave ? "revisar" : "mirar"}
            titulo={grupo.titulo}
            contador={grupo.items.length}
            tono={grupo.grave ? "peligro" : "aviso"}
          >
            <CardContent className="pt-3">
              <ItemGroup variant="cajitas" className="max-lg:divide-y max-lg:divide-linea-fila">
                {grupo.items.map((h, i) => (
                  <Fragment key={`${h.tipo}-${h.fecha}-${i}`}>
                    <Item asChild size="sm" className="flex-nowrap items-start gap-3 px-0 py-3">
                      <Link href={destino(h)}>
                        <ItemMedia
                          className={cn(
                            "size-8 rounded-full group-has-[[data-slot=item-description]]/item:translate-y-0",
                            grupo.grave ? "bg-bad-bg text-bad-fg" : "bg-warn-bg text-warn-fg",
                          )}
                        >
                          {grupo.grave ? <WarningCircle size={16} weight="fill" /> : <Info size={16} weight="fill" />}
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0.5">
                          {/* El monto va a la derecha del título: así el detalle
                              usa todo el ancho y no queda en una columna angosta. */}
                          <ItemTitle className="w-full items-start justify-between gap-3">
                            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                              <span className="text-body font-medium text-text">{h.titulo}</span>
                              <span className="text-meta font-normal text-faint">{formatDia(h.fecha)}</span>
                            </span>
                            {h.monto !== null && (
                              <span className="tnum shrink-0 text-title font-medium text-text">{formatCOP(h.monto)}</span>
                            )}
                          </ItemTitle>
                          <ItemDescription className="line-clamp-none leading-snug text-balance text-muted">
                            {h.detalle}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="shrink-0 self-center">
                          <FlechaFila />
                        </ItemActions>
                      </Link>
                    </Item>
                  </Fragment>
                ))}
              </ItemGroup>
            </CardContent>
          </Cajon>
        ))}
    </div>
  );
}
