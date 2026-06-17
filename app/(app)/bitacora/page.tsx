import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAuditLog } from "@/lib/queries";
import { BitacoraView } from "@/components/bitacora/bitacora-view";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Bitácora · Corresponsal" };

export default async function BitacoraPage() {
  await requireAdmin();
  const entries = await getAuditLog(250);

  return (
    <div>
      <PageHeader title="Bitácora" subtitle="Cada cambio en el dinero queda registrado: quién, qué y cuándo" />
      <BitacoraView entries={entries} />
    </div>
  );
}
