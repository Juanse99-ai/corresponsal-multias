import type { Metadata } from "next";
import { Prohibit } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { signOutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Sin acceso · Corresponsal",
  robots: { index: false, follow: false },
};

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <Logo size={44} />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Prohibit size={24} weight="bold" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-text">Tu usuario no tiene acceso</h1>
          <p className="text-sm leading-relaxed text-muted">
            Esta cuenta no está habilitada para la app del corresponsal (Barrio Centro Sabanalarga 18).
            Si crees que es un error, pídele a Juan que te dé acceso.
          </p>
        </div>
        <form action={signOutAction} className="w-full">
          <button
            type="submit"
            className="h-11 w-full rounded-full border border-line bg-surface text-sm font-medium text-text transition-colors hover:bg-surface-2"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
