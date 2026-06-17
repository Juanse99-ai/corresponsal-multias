import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { hoyISO, formatFechaLarga } from "@/lib/format";
import {
  getGeneralEntry,
  getGeneralEntries,
  getMovPropios,
  getSoportes,
  getSaldoLuisAcumulado,
} from "@/lib/queries";
import { GeneralEditor } from "@/components/general/general-editor";
import { GeneralTable } from "@/components/general/general-table";
import { MovPropios } from "@/components/general/mov-propios";
import { SoportesSection } from "@/components/cuadre/soportes-section";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Control general · Corresponsal" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function GeneralPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const fecha = sp.fecha && ISO.test(sp.fecha) ? sp.fecha : hoyISO();

  const [entry, entries, movimientos, soportes, saldoLuisSugerido] = await Promise.all([
    getGeneralEntry(fecha),
    getGeneralEntries(),
    getMovPropios(),
    getSoportes(fecha, "general"),
    getSaldoLuisAcumulado(fecha, true),
  ]);

  const inicial = entry
    ? {
        saldo_luis: entry.saldo_luis,
        saldo_cristian: entry.saldo_cristian,
        cupo_disponible: entry.cupo_disponible,
        efectivo: entry.efectivo,
        nequis: entry.nequis,
        monedas: entry.monedas,
        deudas_terceros: entry.deudas_terceros,
        nota: entry.nota ?? "",
      }
    : {
        saldo_luis: saldoLuisSugerido,
        saldo_cristian: 0,
        cupo_disponible: 0,
        efectivo: 0,
        nequis: 0,
        monedas: 0,
        deudas_terceros: 0,
        nota: "",
      };

  return (
    <div>
      <PageHeader title="Control general" subtitle={formatFechaLarga(fecha)} />
      <div className="flex flex-col gap-5">
        <GeneralEditor
          fecha={fecha}
          inicial={inicial}
          saldoLuisSugerido={saldoLuisSugerido}
          existente={!!entry}
        />
        <SoportesSection
          fecha={fecha}
          soportes={soportes}
          contexto="general"
          titulo="Anexos del día"
          texto="Sube un soporte (foto o PDF)"
        />
        <MovPropios movimientos={movimientos} />
        <GeneralTable entries={entries} />
      </div>
    </div>
  );
}
