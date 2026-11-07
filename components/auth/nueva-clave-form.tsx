"use client";

import { useActionState } from "react";
import { cambiarClaveAction, type NuevaClaveState } from "@/app/nueva-clave/actions";
import { CLAVE_MINIMA } from "@/lib/clave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/error-notice";

const initial: NuevaClaveState = { error: null };

export function NuevaClaveForm({ correo }: { correo: string }) {
  const [state, action, pending] = useActionState(cambiarClaveAction, initial);

  return (
    <form action={action} className="flex w-full flex-col gap-5">
      {/* Para que el gestor de claves del celular la guarde con la cuenta correcta. */}
      <input type="text" name="username" autoComplete="username" value={correo} readOnly hidden />

      <Field label="Clave nueva" htmlFor="password" hint={`Mínimo ${CLAVE_MINIMA} caracteres.`}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={CLAVE_MINIMA}
          required
          autoFocus
        />
      </Field>

      <Field label="Repite la clave" htmlFor="password2">
        <Input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          minLength={CLAVE_MINIMA}
          required
        />
      </Field>

      <ErrorNotice message={state.error} />

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
