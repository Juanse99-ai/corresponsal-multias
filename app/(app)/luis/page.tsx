import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import { getConsignacionesLuis, getCompensacionesLuis, getSaldoLuisAcumulado, getSoportes } from "@/lib/queries";
import { LuisManager } from "@/components/luis/luis-manager";
import { SoportesSection } from "@/components/cuadre/soportes-section";
import { ComprobantesLector } from "@/components/luis/comprobantes-lector";
import { LuisEnVivo } from "@/components/luis/luis-en-vivo";
import { CompensacionesPorConfirmar } from "@/components/luis/compensaciones-por-confirmar";
import { CONTEXTO_COMPENSACION } from "@/lib/compensacion";
import { leerComprobantesDelDia, agregarConsignacionesDesdeFotos } from "@/app/(app)/luis/actions";
import { PageHeader, CifraCabecera } from "@/components/shell/page-header";
import { ReporteLuisButton } from "@/components/luis/reporte-luis";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { DateNav } from "@/components/shell/date-nav";
import { ArrowUpRight, ArrowDownLeft, CheckCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Cuenta del Sr. Luis · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function LuisPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [consignaciones, compensaciones, acumuladoAyer, soportes, porConfirmar] = await Promise.all([
    getConsignacionesLuis(fecha),
    getCompensacionesLuis(fecha),
    getSaldoLuisAcumulado(fecha, false),
    getSoportes(fecha, "luis"),
    // Compensaciones que Luis mandó al grupo y esperan confirmación (app/api/agente/compensacion).
    getSoportes(fecha, CONTEXTO_COMPENSACION),
  ]);

  // El saldo acumulado (lo que el punto le debe al Sr. Luis): la cifra de la cabecera.
  const totalComp = compensaciones.reduce((s, c) => s + c.monto, 0);
  const totalConsig = consignaciones.reduce((s, c) => s + c.monto, 0);
  const acumulado = acumuladoAyer + totalComp - totalConsig;

  return (
    <div>
      <PageHeader
        title="Cuenta del Sr. Luis"
        subtitle={formatFechaLarga(fecha)}
        cifras={
          <CifraCabecera
            rotulo="Saldo acumulado del Sr. Luis"
            chip={
              <Badge variant={acumulado > 0 ? "info" : acumulado === 0 ? "success" : "secondary"}>
                {acumulado > 0 ? (
                  <ArrowUpRight weight="bold" />
                ) : acumulado < 0 ? (
                  <ArrowDownLeft weight="bold" />
                ) : (
                  <CheckCircle weight="fill" />
                )}
                {acumulado > 0 ? "A favor de Luis" : acumulado < 0 ? "A favor del punto" : "Igualado"}
              </Badge>
            }
          >
            <AnimatedMoney value={acumulado} />
          </CifraCabecera>
        }
      >
        <DateNav fecha={fecha} base="/luis" />
        <ReporteLuisButton
          comoIcono
          fecha={fecha}
          consignaciones={consignaciones}
          compensaciones={compensaciones}
          acumulado={acumulado}
          acumuladoAyer={acumuladoAyer}
        />
      </PageHeader>
      <LuisEnVivo fecha={fecha} />
      <CompensacionesPorConfirmar fotos={porConfirmar} />
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
          titulo="Comprobantes"
          texto="Fotos de las transferencias"
          detalleBorrado="Se borra la foto. Los movimientos no cambian."
        />
        <ComprobantesLector
          fecha={fecha}
          cantidadFotos={soportes.length}
          leerFotos={leerComprobantesDelDia}
          guardarLote={agregarConsignacionesDesdeFotos}
        />
      </div>
    </div>
  );
}
