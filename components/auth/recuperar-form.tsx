"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { pedirRecuperacionAction, type RecuperarState } from "@/app/recuperar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/error-notice";

const initial: RecuperarState = { error: null, enviado: false };

const volver = (
  <Link
    href="/login"
    className="inline-flex items-center gap-1.5 self-center text-[0.85rem] font-medium text-accent-strong underline-offset-4 hover:underline"
  >
    <ArrowLeft size={15} weight="bold" />
    Volver a entrar
  </Link>
);

export function RecuperarForm({ enlaceVencido }: { enlaceVencido: boolean }) {
  const [state, action, pending] = useActionState(pedirRecuperacionAction, initial);

  if (state.enviado) {
    return (
      <div className="flex flex-col gap-6">
        <div role="status" className="flex items-start gap-3 rounded-card border border-line bg-surface-2/60 p-4">
          <EnvelopeSimple size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-text">
            Si ese usuario existe, te llegó un correo con un enlace para poner una clave nueva. Ábrelo
            en este mismo dispositivo. Revisa también la carpeta de spam.
          </p>
        </div>
        {volver}
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-5">
      <Field label="Usuario o correo" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          placeholder="ivana  ·  o tu correo"
          required
          autoFocus
        />
      </Field>

      <ErrorNotice
        message={state.error ?? (enlaceVencido ? "Ese enlace ya no sirve. Pide uno nuevo." : null)}
      />

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </Button>

      {volver}
    </form>
  );
}
