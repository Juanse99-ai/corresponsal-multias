import type { Metadata } from "next";
import { Prohibit, SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogIcon } from "@/components/ui/dialog";
import { Logo } from "@/components/brand";
import { signOutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Sin acceso · Corresponsal",
  robots: { index: false, follow: false },
};

/** Dibujo de ventana sobre el lienzo: círculo rojo, título y Cerrar sesión. */
export default function SinAccesoPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4 py-10">
      <Logo size={44} />
      <Card className="w-full max-w-[420px] border-0 bg-blanco p-[22px] shadow-ventana">
        <div className="flex items-start gap-3.5">
          <DialogIcon tono="bad">
            <Prohibit weight="bold" />
          </DialogIcon>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-px">
            <h1 className="text-h1 font-semibold tracking-[-0.4px] text-text">Tu usuario no tiene acceso</h1>
            <p className="text-body text-muted">
              Esta cuenta no está habilitada para la app del corresponsal (Barrio Centro Sabanalarga 18).
              Si crees que es un error, pídele a Juan que te dé acceso.
            </p>
          </div>
        </div>
        <form action={signOutAction} className="mt-5">
          <Button type="submit" variant="secondary" className="w-full">
            <SignOut size={17} />
            Cerrar sesión
          </Button>
        </form>
      </Card>
    </main>
  );
}
