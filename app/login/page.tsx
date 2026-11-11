import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { tieneCookieEquipo } from "@/lib/caja-servidor";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

/**
 * Entrar con correo: el administrador siempre; los demás solo la primera vez,
 * para crear su clave de caja (después el correo ya no los deja entrar). En un
 * equipo de caja no hace falta: allí se toca el nombre y, sin clave, se crea.
 */
export default async function LoginPage() {
  if (await tieneCookieEquipo()) redirect("/caja");
  return (
    <AuthLayout titulo="Iniciar sesión" detalle="Solo la primera vez. Después, con tu clave de caja." pie="Solo personal autorizado">
      <LoginForm />
    </AuthLayout>
  );
}
