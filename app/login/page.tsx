import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { Saludo } from "@/components/auth/hoy";
import Link from "next/link";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    <AuthLayout
      titulo={<Saludo />}
      titulo2="Bienvenido al corresponsal"
      pie={
        <>
          ¿Olvidaste la contraseña?{" "}
          <Link href="/recuperar" className="font-medium text-accent hover:text-accent-strong">
            Recupérala aquí
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
