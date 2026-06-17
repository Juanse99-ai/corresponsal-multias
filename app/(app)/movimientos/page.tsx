import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import { getMovimientos } from "@/lib/queries";
import { MovimientosManager } from "@/components/movimientos/movimientos-manager";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Movimientos · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();
  const movimientos = await getMovimientos(fecha);

  return (
    <div>
      <PageHeader title="Movimientos del día" subtitle={formatFechaLarga(fecha)} />
      <MovimientosManager fecha={fecha} movimientos={movimientos} />
    </div>
  );
}
