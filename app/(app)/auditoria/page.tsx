import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getHallazgosAuditoria, getMontosConsignados } from "@/lib/queries";
import { addDiasISO, hoyISO } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { ListaHallazgos } from "@/components/auditoria/lista-hallazgos";
import { CruceChat } from "@/components/auditoria/cruce-chat";

export const metadata: Metadata = { title: "Auditoría · Corresponsal" };

/** Ventana que se revisa: lo más viejo ya se revisó y solo haría ruido. */
const DIAS_ATRAS = 90;

export default async function AuditoriaPage() {
  await requireAdmin();
  const hallazgos = await getHallazgosAuditoria(addDiasISO(hoyISO(), -DIAS_ATRAS));

  async function montosDelDia(fecha: string): Promise<number[]> {
    "use server";
    await requireAdmin();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
    return getMontosConsignados(fecha);
  }

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle={`Revisiones de la cuenta de Sr. Luis · últimos ${DIAS_ATRAS} días`}
      />
      <div className="flex flex-col gap-5">
        <ListaHallazgos hallazgos={hallazgos} />
        <CruceChat montosDelDia={montosDelDia} />
      </div>
    </div>
  );
}
