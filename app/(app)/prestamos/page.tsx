import type { Metadata } from "next";
import { getDeudasConSaldo, agruparDeudasPorPersona } from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { PrestamosManager } from "@/components/prestamos/prestamos-manager";
import { PageHeader, CifraCabecera } from "@/components/shell/page-header";
import { AnimatedMoney } from "@/components/ui/animated-number";

export const metadata: Metadata = { title: "Préstamos · Corresponsal" };

export default async function PrestamosPage() {
  const profile = await getSessionProfile();
  const deudas = await getDeudasConSaldo();
  const grupos = agruparDeudasPorPersona(deudas);
  const isAdmin = profile?.rol === "admin";
  // Lo que le deben al fondo: la cifra de la cabecera (solo la ve el admin).
  const totalPendiente = grupos.filter((g) => g.saldo > 0).reduce((s, g) => s + g.saldo, 0);

  return (
    <div>
      <PageHeader
        title="Préstamos"
        subtitle="Saldos del fondo del corresponsal"
        cifras={
          isAdmin ? (
            <CifraCabecera rotulo="Total pendiente">
              <AnimatedMoney value={totalPendiente} />
            </CifraCabecera>
          ) : undefined
        }
      />
      <PrestamosManager grupos={grupos} isAdmin={isAdmin} />
    </div>
  );
}
