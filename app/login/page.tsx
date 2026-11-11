import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { tieneCookieEquipo } from "@/lib/caja-servidor";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default async function LoginPage() {
  // En un equipo de caja, volver a la clave sin escribir correo.
  const equipo = await tieneCookieEquipo();
  return (
    <AuthLayout titulo="Iniciar sesión" pie="Solo personal autorizado">
      <LoginForm />
      {equipo && (
        <Button asChild variant="link" className="mt-3 w-full">
          <Link href="/caja">Entrar con clave de caja</Link>
        </Button>
      )}
    </AuthLayout>
  );
}
