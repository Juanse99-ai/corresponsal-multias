import { Wordmark } from "@/components/brand";
import { LoginHero } from "@/components/auth/login-hero";

/** Marco de las pantallas de acceso (entrar, recuperar clave, clave nueva). */
export function AuthLayout({
  titulo,
  detalle,
  pie,
  children,
}: {
  titulo: string;
  detalle: string;
  pie?: React.ReactNode;
  children: React.ReactNode;
}) {
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

          <h2 className="text-2xl font-semibold tracking-tight text-text">{titulo}</h2>
          <p className="mt-1.5 text-sm text-muted">{detalle}</p>

          <div className="mt-8">{children}</div>

          {pie && <div className="mt-8 text-[0.72rem] leading-relaxed text-faint">{pie}</div>}
        </div>
      </section>
    </main>
  );
}
