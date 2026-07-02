import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import { getConsignacionesLuis, getCompensacionesLuis, getSaldoLuisAcumulado } from "@/lib/queries";
import { LuisManager } from "@/components/luis/luis-manager";
import { PageHeader } from "@/components/shell/page-header";
import { DateNav } from "@/components/shell/date-nav";

export const metadata: Metadata = { title: "Cupo de Luis · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function LuisPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [consignaciones, compensaciones, acumuladoAyer] = await Promise.all([
    getConsignacionesLuis(fecha),
    getCompensacionesLuis(fecha),
    getSaldoLuisAcumulado(fecha, false),
  ]);

  return (
    <div>
      <PageHeader title="Cupo de Luis" subtitle={formatFechaLarga(fecha)}>
        <DateNav fecha={fecha} base="/luis" />
      </PageHeader>
      <LuisManager
        fecha={fecha}
        acumuladoAyer={acumuladoAyer}
        consignaciones={consignaciones}
        compensaciones={compensaciones}
      />
    </div>
  );
}
