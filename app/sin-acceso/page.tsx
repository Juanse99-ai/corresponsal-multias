import type { Metadata } from "next";
import { Prohibit, SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Logo } from "@/components/brand";
import { signOutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Sin acceso · Corresponsal",
  robots: { index: false, follow: false },
};

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6">
      <Empty className="w-full max-w-sm gap-5 p-0 md:p-0">
        <Logo size={44} />
        <EmptyHeader className="gap-1.5">
          <EmptyMedia variant="icon" className="mb-3.5 h-12 w-12 rounded-full bg-danger-soft text-danger">
            <Prohibit size={24} weight="bold" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-semibold text-text">
            <h1>Tu usuario no tiene acceso</h1>
          </EmptyTitle>
          <EmptyDescription>
            Esta cuenta no está habilitada para la app del corresponsal (Barrio Centro Sabanalarga 18).
            Si crees que es un error, pídele a Juan que te dé acceso.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-none">
          <form action={signOutAction} className="w-full">
            <Button type="submit" variant="secondary" className="w-full">
              <SignOut size={17} />
              Cerrar sesión
            </Button>
          </form>
        </EmptyContent>
      </Empty>
    </main>
  );
}
