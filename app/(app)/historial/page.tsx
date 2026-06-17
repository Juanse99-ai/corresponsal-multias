import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listCuadres } from "@/lib/queries";
import { HistorialTable } from "@/components/historial/historial-table";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Historial · Corresponsal" };

export default async function HistorialPage() {
  await requireAdmin();
  const cuadres = await listCuadres(undefined, undefined, 365);

  return (
    <div>
      <PageHeader title="Historial y reportes" subtitle="Todos los cierres del corresponsal" />
      <HistorialTable cuadres={cuadres} isAdmin />
    </div>
  );
}
