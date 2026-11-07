import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthLayout } from "@/components/auth/auth-layout";
import { NuevaClaveForm } from "@/components/auth/nueva-clave-form";

export const metadata: Metadata = {
  title: "Clave nueva · Corresponsal",
  robots: { index: false, follow: false },
};

export default async function NuevaClavePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin sesión del enlace no hay a quién cambiarle la clave.
  if (!user?.email) redirect("/recuperar?enlace=vencido");

  return (
    <AuthLayout titulo="Clave nueva" detalle={`Para ${user.email}.`}>
      <NuevaClaveForm correo={user.email} />
    </AuthLayout>
  );
}
