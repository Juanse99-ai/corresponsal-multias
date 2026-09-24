import { Fragment } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle, Info, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  ItemGroup,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemSeparator,
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

  if (hallazgos.length === 0) {
    return (
      <Card className="p-0">
        <Empty className="gap-2 p-8 md:p-8">
          <EmptyHeader>
            <EmptyMedia className="mb-0 text-success">
              <CheckCircle size={22} weight="fill" />
            </EmptyMedia>
            <EmptyTitle className="text-[0.9rem] text-text">Sin hallazgos</EmptyTitle>
            <EmptyDescription className="text-[0.8rem]">
              Ningún registro pasa del tope, no hay duplicados y todos los días tienen su cuadre.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
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
            <Card className="overflow-hidden p-0">
              <ItemGroup>
                {grupo.items.map((h, i) => (
                  <Fragment key={`${h.tipo}-${h.fecha}-${i}`}>
                    {i > 0 && <ItemSeparator />}
                    <Item asChild size="sm" className="items-start gap-3 rounded-none hover:bg-surface-2">
                      <Link href={destino(h)}>
                        <ItemMedia className="mt-0.5">
                          {grupo.grave ? (
                            <WarningCircle size={17} weight="fill" className="text-danger" />
                          ) : (
                            <Info size={17} weight="fill" className="text-faint" />
                          )}
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0.5">
                          <ItemTitle className="flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-[0.88rem] font-medium text-text">{h.titulo}</span>
                            <span className="text-[0.74rem] font-normal text-faint">{formatFechaCorta(h.fecha)}</span>
                            {h.monto !== null && (
                              <Badge
                                variant={grupo.grave ? "danger" : "outline"}
                                className={cn("tnum text-[0.78rem]", !grupo.grave && "text-text")}
                              >
                                {formatCOP(h.monto)}
                              </Badge>
                            )}
                          </ItemTitle>
                          <ItemDescription className="line-clamp-none text-[0.76rem] leading-snug text-balance">
                            {h.detalle}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="mt-1">
                          <CaretRight size={14} className="text-faint" />
                        </ItemActions>
                      </Link>
                    </Item>
                  </Fragment>
                ))}
              </ItemGroup>
            </Card>
          </div>
        ))}
    </div>
  );
}
