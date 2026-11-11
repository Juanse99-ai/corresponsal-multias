import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CajaClave } from "@/components/auth/caja-clave";
import { datosCaja } from "@/lib/caja-servidor";

export const metadata: Metadata = { title: "Clave · Corresponsal" };
export const dynamic = "force-dynamic";

/**
 * Entrada con clave de caja. Solo en un equipo autorizado; en otro (o sin la
 * llave de servicio configurada) se entra con correo.
 */
export default async function CajaPage() {
  const { listo, equipo, personas } = await datosCaja();
  if (!listo || !equipo) redirect("/login");
  return (
    <AuthLayout titulo="¿Quién eres?" pie={equipo}>
      <CajaClave personas={personas} />
    </AuthLayout>
  );
}
