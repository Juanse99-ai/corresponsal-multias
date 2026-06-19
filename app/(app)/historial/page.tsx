import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listCuadres, listLuisHistorial } from "@/lib/queries";
import { HistorialTabs } from "@/components/historial/historial-tabs";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Historial · Corresponsal" };
export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  await requireAdmin();
  const [cuadres, luis] = await Promise.all([
    listCuadres(undefined, undefined, 365),
    listLuisHistorial(),
  ]);

  return (
    <div>
      <PageHeader title="Historial y reportes" subtitle="Cierres del corresponsal y cuenta de Sr. Luis" />
      <HistorialTabs cuadres={cuadres} luis={luis} />
    </div>
  );
}
