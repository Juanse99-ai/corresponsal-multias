import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RecuperarForm } from "@/components/auth/recuperar-form";

export const metadata: Metadata = { title: "Recuperar contraseña · Corresponsal" };

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ enlace?: string }>;
}) {
  const { enlace } = await searchParams;
  return (
    <AuthLayout
      titulo="Recuperar contraseña"
      detalle="Te mandamos un enlace al correo de tu cuenta para que pongas una clave nueva."
      pie="Es la misma clave de la app del taller: si la cambias aquí, cambia allá también."
    >
      <RecuperarForm enlaceVencido={enlace === "vencido"} />
    </AuthLayout>
  );
}
