import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import {
  getConsignacionesLuis,
  getCuadre,
  getSoportes,
  getMovimientos,
  totalesMovimientos,
  getPrestamosDia,
  prestamosPendientesPorMedio,
  sumMontos,
} from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { CuadreEditor } from "@/components/cuadre/cuadre-editor";
import { SoportesSection } from "@/components/cuadre/soportes-section";
import { PageHeader } from "@/components/shell/page-header";
import { DateNav } from "@/components/shell/date-nav";
import type { EstadoCuadre } from "@/lib/cuadre";

export const metadata: Metadata = { title: "Cuadre diario · Corresponsal" };
// Siempre datos frescos: al navegar entre días no debe servir una versión cacheada.
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function CuadrePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [cuadre, consignaciones, soportes, movimientos, prestamos, profile] = await Promise.all([
    getCuadre(fecha),
    getConsignacionesLuis(fecha),
    getSoportes(fecha),
    getMovimientos(fecha),
    getPrestamosDia(fecha),
    getSessionProfile(),
  ]);
  const srLuis = sumMontos(consignaciones);
  const isAdmin = profile?.rol === "admin";
  const tot = totalesMovimientos(movimientos);
  const prestamosMedio = prestamosPendientesPorMedio(prestamos);

  const inicial = cuadre
    ? {
        total_tirilla: cuadre.total_tirilla,
        efectivo_consignaciones: cuadre.efectivo_consignaciones,
        retiros_cash: cuadre.retiros_cash,
        nequis: cuadre.nequis,
        bancolombia: cuadre.bancolombia,
        recaudos: cuadre.recaudos,
        prestamos_consignaciones: cuadre.prestamos_consignaciones,
        ret_real: cuadre.ret_real,
        compensado: cuadre.compensado,
        fondo_caja: cuadre.fondo_caja,
        efectivo_contado: cuadre.efectivo_contado,
        estado: cuadre.estado as EstadoCuadre,
        nota: cuadre.nota ?? "",
      }
    : {
        total_tirilla: 0,
        efectivo_consignaciones: 0,
        retiros_cash: 0,
        nequis: tot.consignacion_nequi,
        bancolombia: tot.consignacion_bancolombia,
        recaudos: tot.recaudo,
        prestamos_consignaciones: prestamosMedio.transferencia,
        ret_real: tot.retiro,
        compensado: 0,
        fondo_caja: 0,
        efectivo_contado: 0,
        estado: "abierto" as EstadoCuadre,
        nota: "",
      };

  return (
    <div>
      <PageHeader title="Cuadre diario" subtitle={formatFechaLarga(fecha)}>
        <DateNav fecha={fecha} base="/cuadre" />
      </PageHeader>
      <CuadreEditor
        key={fecha}
        fecha={fecha}
        srLuis={srLuis}
        consignacionesCount={consignaciones.length}
        existente={!!cuadre}
        inicial={inicial}
        isAdmin={isAdmin}
        nombre={profile?.nombre ?? ""}
        soportesCount={soportes.length}
        movCount={tot.cantidad}
        prestamosCount={prestamos.filter((d) => d.medio !== "registro").length}
        prestamosTransferDia={prestamosMedio.transferencia}
        prestamosEfectivoDia={prestamosMedio.efectivo}
        movTotales={{
          consignacion_nequi: tot.consignacion_nequi,
          consignacion_bancolombia: tot.consignacion_bancolombia,
          retiro: tot.retiro,
          recaudo: tot.recaudo,
        }}
      />
      <SoportesSection fecha={fecha} soportes={soportes} />
    </div>
  );
}
