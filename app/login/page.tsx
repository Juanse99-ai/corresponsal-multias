import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    // group/login: con un campo enfocado en el celular (teclado abierto), la
    // banda se encoge y el botón Entrar queda a la vista encima del teclado.
    <main className="group/login grid min-h-[100dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-none">
      <section className="relative hidden bg-nav-bg lg:block">
        <LoginHero />
      </section>

      {/* Celular: banda de marca arriba (en el PC hace ese papel el panel azul). */}
      <header
        className={
          "relative flex flex-col items-center gap-3.5 overflow-hidden rounded-b-[2rem] bg-nav-bg px-6 pb-6 text-center lg:hidden " +
          "bg-[radial-gradient(120%_90%_at_20%_0%,var(--nav-bg-2),var(--nav-bg)_60%)] " +
          "group-has-[input:focus]/login:flex-row group-has-[input:focus]/login:gap-3 group-has-[input:focus]/login:rounded-b-[1.5rem] group-has-[input:focus]/login:pb-3.5 group-has-[input:focus]/login:text-left"
        }
        style={{ paddingTop: "max(3.25rem, calc(env(safe-area-inset-top) + 1.25rem))" }}
      >
        <svg
          aria-hidden
          viewBox="0 0 390 60"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[4.25rem] h-[60px] w-full opacity-35 group-has-[input:focus]/login:hidden"
        >
          <path d="M0 34 H120 L134 34 L144 12 L156 52 L168 20 L178 34 H390" fill="none" stroke="var(--nav-accent)" strokeWidth="2" />
        </svg>
        <Logo size={84} className="relative rounded-[1.4rem] shadow-[0_10px_30px_-10px_oklch(0.1_0.05_260/0.6)] group-has-[input:focus]/login:hidden" />
        <Logo size={40} className="relative hidden group-has-[input:focus]/login:flex" />
        <div className="relative leading-tight">
          <p className="text-[0.82rem] font-semibold tracking-tight text-nav-text">Barrio Centro Sabanalarga 18</p>
          <p className="mt-0.5 text-[0.72rem] text-nav-muted">Multidiagnósticos AS</p>
        </div>
      </header>

      <section className="flex flex-col items-center px-5 pb-10 pt-7 group-has-[input:focus]/login:pt-5 sm:px-10 lg:justify-center lg:py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[1.9rem] font-bold leading-[1.08] tracking-tight text-text group-has-[input:focus]/login:text-2xl lg:hidden">
            El cuadre del día, <span className="text-accent">cuadrado.</span>
          </h1>
          <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-text lg:block">Entrar</h1>
          <p className="mt-1.5 text-[0.95rem] text-muted group-has-[input:focus]/login:hidden lg:group-has-[input:focus]/login:block">
            Entra con tu usuario.
          </p>

          <div className="mt-6 group-has-[input:focus]/login:mt-4 lg:group-has-[input:focus]/login:mt-6">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-[0.75rem] text-faint group-has-[input:focus]/login:hidden lg:group-has-[input:focus]/login:block">
            Solo personal autorizado
          </p>
        </div>
      </section>
    </main>
  );
}
