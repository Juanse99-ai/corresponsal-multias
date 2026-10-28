"use client";

import { useActionState } from "react";
import Link from "next/link";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { pedirRecuperacionAction, type RecuperarState } from "@/app/recuperar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice } from "@/components/ui/error-notice";

const initial: RecuperarState = { error: null, enviado: false };

function Volver() {
  return (
    <Button asChild variant="link" className="mt-3 w-full">
      <Link href="/login">Volver a iniciar sesión</Link>
    </Button>
  );
}

export function RecuperarForm({ enlaceVencido }: { enlaceVencido: boolean }) {
  const [state, action, pending] = useActionState(pedirRecuperacionAction, initial);

  if (state.enviado) {
    return (
      <div className="flex flex-col">
        <Alert role="status">
          <EnvelopeSimple weight="fill" />
          <AlertDescription>
            Si ese usuario existe, le llegó un correo con un enlace para poner una clave nueva. Ábrelo
            en este mismo dispositivo y revisa también el spam.
          </AlertDescription>
        </Alert>
        <Volver />
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Usuario o correo</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <ErrorNotice
        message={state.error ?? (enlaceVencido ? "Ese enlace ya no sirve. Pide uno nuevo." : null)}
        className="mt-3"
      />

      <Button type="submit" size="lg" disabled={pending} className="mt-5 w-full">
        {pending ? (
          <>
            <Spinner className="size-[18px]" aria-hidden />
            Enviando…
          </>
        ) : (
          "Enviarme el enlace"
        )}
      </Button>

      <Volver />
    </form>
  );
}
