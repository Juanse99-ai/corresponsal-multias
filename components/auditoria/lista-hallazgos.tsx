import { Fragment } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle, Info, CaretRight, Eye, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Contador } from "@/components/ui/contador";
import { Badge } from "@/components/ui/badge";
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
import { formatCOP, formatFechaCorta } from "@/lib/format";
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
      <Card>
        <CardHeader className="items-center pb-5">
          <CardTitle className="self-center text-text" icono={<ShieldCheck />}>
            <h2>Sin hallazgos</h2>
          </CardTitle>
          <CardAction className="self-center">
            <Badge variant="success">
              <CheckCircle weight="fill" />
              Cuadra
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      {[
        { titulo: "Revisar", items: graves, grave: true },
        { titulo: "Mirar", items: avisos, grave: false },
      ]
        .filter((g) => g.items.length > 0)
        .map((grupo) => (
          <Fragment key={grupo.titulo}>
            <CardHeader className="items-center pb-2">
              <CardTitle
                className="self-center text-text"
                icono={grupo.grave ? <WarningCircle /> : <Eye />}
              >
                <h2>{grupo.titulo}</h2>
              </CardTitle>
              <CardAction className="self-center">
                <Contador n={grupo.items.length} tono={grupo.grave ? "peligro" : "aviso"} />
              </CardAction>
            </CardHeader>
            <CardContent className="not-last:pb-2">
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
                              <span className="text-meta font-normal text-faint">{formatFechaCorta(h.fecha)}</span>
                            </span>
                            {h.monto !== null && (
                              <span className="tnum shrink-0 text-title font-semibold text-text">{formatCOP(h.monto)}</span>
                            )}
                          </ItemTitle>
                          <ItemDescription className="line-clamp-none leading-snug text-balance text-muted">
                            {h.detalle}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="shrink-0 self-center">
                          <CaretRight size={14} weight="bold" className="text-inerte" />
                        </ItemActions>
                      </Link>
                    </Item>
                  </Fragment>
                ))}
              </ItemGroup>
            </CardContent>
          </Fragment>
        ))}
    </Card>
  );
}
