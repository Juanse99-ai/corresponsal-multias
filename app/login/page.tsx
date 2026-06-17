import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] w-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden bg-nav-bg lg:block">
        <LoginHero />
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-text">Entrar al panel</h2>
          <p className="mt-1.5 text-sm text-muted">Usa tu usuario (o correo) y tu contraseña.</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 text-[0.72rem] leading-relaxed text-faint">
            Acceso restringido al personal del corresponsal. Si olvidaste tu contraseña, pídele a
            Juan que la restablezca.
          </p>
        </div>
      </section>
    </main>
  );
}
