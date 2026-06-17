import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import { getMovimientos, getPrestamosDia } from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { MovimientosManager } from "@/components/movimientos/movimientos-manager";
import { PrestamosDia } from "@/components/movimientos/prestamos-dia";
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
  const [movimientos, prestamos, profile] = await Promise.all([
    getMovimientos(fecha),
    getPrestamosDia(fecha),
    getSessionProfile(),
  ]);

  return (
    <div>
      <PageHeader title="Movimientos del día" subtitle={formatFechaLarga(fecha)} />
      <MovimientosManager fecha={fecha} movimientos={movimientos} />
      <PrestamosDia fecha={fecha} prestamos={prestamos} isAdmin={profile?.rol === "admin"} />
    </div>
  );
}
