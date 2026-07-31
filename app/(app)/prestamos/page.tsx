import type { Metadata } from "next";
import { getDeudasConSaldo, agruparDeudasPorPersona } from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { PrestamosManager } from "@/components/prestamos/prestamos-manager";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Préstamos · Corresponsal" };

export default async function PrestamosPage() {
  const profile = await getSessionProfile();
  const deudas = await getDeudasConSaldo();
  const grupos = agruparDeudasPorPersona(deudas);

  return (
    <div>
      <PageHeader title="Préstamos / Deudas" subtitle="Saldos del fondo del corresponsal" />
      <PrestamosManager grupos={grupos} isAdmin={profile?.rol === "admin"} />
    </div>
  );
}
