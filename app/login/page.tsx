import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    <AuthLayout
      titulo="Entrar al panel"
      detalle="Usa tu usuario (o correo) y tu contraseña."
      pie="Acceso restringido al personal del corresponsal."
    >
      <LoginForm />
    </AuthLayout>
  );
}
