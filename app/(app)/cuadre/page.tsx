import type { Metadata } from "next";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import {
  getConsignacionesLuis,
  getCuadre,
  getSoportes,
  getMovimientos,
  totalesMovimientos,
  sumMontos,
} from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { CuadreEditor } from "@/components/cuadre/cuadre-editor";
import { SoportesSection } from "@/components/cuadre/soportes-section";
import { PageHeader } from "@/components/shell/page-header";
import type { EstadoCuadre } from "@/lib/cuadre";

export const metadata: Metadata = { title: "Cuadre diario · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function CuadrePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [cuadre, consignaciones, soportes, movimientos, profile] = await Promise.all([
    getCuadre(fecha),
    getConsignacionesLuis(fecha),
    getSoportes(fecha),
    getMovimientos(fecha),
    getSessionProfile(),
  ]);
  const srLuis = sumMontos(consignaciones);
  const isAdmin = profile?.rol === "admin";
  const tot = totalesMovimientos(movimientos);

  const inicial = cuadre
    ? {
        total_tirilla: cuadre.total_tirilla,
        efectivo_consignaciones: cuadre.efectivo_consignaciones,
        retiros_cash: cuadre.retiros_cash,
        nequis: cuadre.nequis,
        bancolombia: cuadre.bancolombia,
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
        efectivo_consignaciones: tot.consignacion,
        retiros_cash: 0,
        nequis: tot.nequi,
        bancolombia: tot.bancolombia,
        prestamos_consignaciones: 0,
        ret_real: tot.retiro,
        compensado: 0,
        fondo_caja: 0,
        efectivo_contado: 0,
        estado: "abierto" as EstadoCuadre,
        nota: "",
      };

  return (
    <div>
      <PageHeader title="Cuadre diario" subtitle={formatFechaLarga(fecha)} />
      <CuadreEditor
        fecha={fecha}
        srLuis={srLuis}
        consignacionesCount={consignaciones.length}
        existente={!!cuadre}
        inicial={inicial}
        isAdmin={isAdmin}
        soportesCount={soportes.length}
        movCount={tot.cantidad}
        movTotales={{
          consignacion: tot.consignacion,
          retiro: tot.retiro,
          nequi: tot.nequi,
          bancolombia: tot.bancolombia,
        }}
      />
      <SoportesSection fecha={fecha} soportes={soportes} />
    </div>
  );
}
