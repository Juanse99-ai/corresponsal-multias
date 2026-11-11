import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CrearMiClave } from "@/components/auth/caja-clave";
import { primerNombre, requireSession } from "@/lib/auth";
import { tieneClaveCaja } from "@/lib/caja-servidor";

export const metadata: Metadata = { title: "Tu clave · Corresponsal" };
export const dynamic = "force-dynamic";

/**
 * Primera vez con correo: antes de seguir, la persona crea su clave de caja.
 * Desde ahí entra solo con ella (el correo ya no la deja entrar).
 */
export default async function CrearClavePage() {
  const perfil = await requireSession();
  if ((await tieneClaveCaja(perfil.id)) !== false) redirect("/panel");
  return (
    <AuthLayout
      titulo={`Hola, ${primerNombre(perfil.nombre)}`}
      detalle="Crea tu clave de 6 números. Desde ahora entras con ella."
      pie="Solo personal autorizado"
    >
      <CrearMiClave />
    </AuthLayout>
  );
}
