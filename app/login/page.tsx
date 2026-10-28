import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    <AuthLayout titulo="Iniciar sesión" pie="Solo personal autorizado">
      <LoginForm />
    </AuthLayout>
  );
}
