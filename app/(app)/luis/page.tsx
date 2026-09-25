import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import { getConsignacionesLuis, getCompensacionesLuis, getSaldoLuisAcumulado, getSoportes } from "@/lib/queries";
import { LuisManager } from "@/components/luis/luis-manager";
import { SoportesSection } from "@/components/cuadre/soportes-section";
import { ComprobantesLector } from "@/components/luis/comprobantes-lector";
import { leerComprobantesDelDia, agregarConsignacionesLote } from "@/app/(app)/luis/actions";
import { PageHeader } from "@/components/shell/page-header";
import { DateNav } from "@/components/shell/date-nav";

export const metadata: Metadata = { title: "Cuenta del Sr. Luis · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function LuisPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [consignaciones, compensaciones, acumuladoAyer, soportes] = await Promise.all([
    getConsignacionesLuis(fecha),
    getCompensacionesLuis(fecha),
    getSaldoLuisAcumulado(fecha, false),
    getSoportes(fecha, "luis"),
  ]);

  return (
    <div>
      <PageHeader title="Cuenta del Sr. Luis" subtitle={formatFechaLarga(fecha)}>
        <DateNav fecha={fecha} base="/luis" />
      </PageHeader>
      <LuisManager
        fecha={fecha}
        acumuladoAyer={acumuladoAyer}
        consignaciones={consignaciones}
        compensaciones={compensaciones}
      />
      <div id="comprobantes" className="scroll-mt-20">
        <SoportesSection
          fecha={fecha}
          soportes={soportes}
          contexto="luis"
          titulo="Comprobantes del día"
          texto="Sube las fotos de las transferencias"
          detalleBorrado="Se borra la foto del comprobante. Los movimientos no cambian."
        />
        <ComprobantesLector
          fecha={fecha}
          cantidadFotos={soportes.length}
          leerFotos={leerComprobantesDelDia}
          guardarLote={agregarConsignacionesLote}
        />
      </div>
    </div>
  );
}
