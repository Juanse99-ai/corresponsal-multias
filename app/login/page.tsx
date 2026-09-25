import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar · Corresponsal" };

export default function LoginPage() {
  return (
    // group/login: con un campo enfocado en el celular (teclado abierto), la
    // banda se encoge y el botón Entrar queda a la vista encima del teclado.
    <main className="group/login grid min-h-[100dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-none">
      {/* PC: panel de marca. */}
      <section className="hidden flex-col items-center justify-center gap-5 bg-nav-bg p-10 text-center lg:flex">
        <Logo size={96} className="rounded-[1.5rem]" />
        <div className="leading-tight">
          <p className="text-lg font-semibold tracking-tight text-nav-text">Barrio Centro Sabanalarga 18</p>
          <p className="mt-1 text-sm text-nav-muted">Multidiagnósticos AS</p>
        </div>
      </section>

      {/* Celular: banda de marca arriba (en el PC hace ese papel el panel azul). */}
      <header
        className={
          "flex flex-col items-center gap-3.5 rounded-b-[2rem] bg-nav-bg px-6 pb-6 text-center lg:hidden " +
          "group-has-[input:focus]/login:flex-row group-has-[input:focus]/login:gap-3 group-has-[input:focus]/login:rounded-b-[1.5rem] group-has-[input:focus]/login:pb-3.5 group-has-[input:focus]/login:text-left"
        }
        style={{ paddingTop: "max(3.25rem, calc(env(safe-area-inset-top) + 1.25rem))" }}
      >
        <Logo size={84} className="rounded-[1.4rem] group-has-[input:focus]/login:hidden" />
        <Logo size={40} className="hidden group-has-[input:focus]/login:flex" />
        <div className="leading-tight">
          <p className="text-[0.82rem] font-semibold tracking-tight text-nav-text">Barrio Centro Sabanalarga 18</p>
          <p className="mt-0.5 text-[0.72rem] text-nav-muted">Multidiagnósticos AS</p>
        </div>
      </header>

      <section className="flex flex-col items-center px-5 pb-10 pt-7 group-has-[input:focus]/login:pt-5 sm:px-10 lg:justify-center lg:py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[1.75rem] font-bold tracking-tight text-text group-has-[input:focus]/login:text-2xl lg:group-has-[input:focus]/login:text-[1.75rem]">
            Iniciar sesión
          </h1>

          <div className="mt-5 group-has-[input:focus]/login:mt-4 lg:group-has-[input:focus]/login:mt-5">
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
