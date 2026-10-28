"use client";

import { useActionState } from "react";
import { cambiarClaveAction, type NuevaClaveState } from "@/app/nueva-clave/actions";
import { CLAVE_MINIMA } from "@/lib/clave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice } from "@/components/ui/error-notice";

const initial: NuevaClaveState = { error: null };

export function NuevaClaveForm({ correo }: { correo: string }) {
  const [state, action, pending] = useActionState(cambiarClaveAction, initial);

  return (
    <form action={action} className="flex w-full flex-col">
      {/* Para que el gestor de claves del celular la guarde con la cuenta correcta. */}
      <input type="text" name="username" autoComplete="username" value={correo} readOnly hidden />

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Clave nueva</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={CLAVE_MINIMA}
            required
            aria-describedby="clave-minimo"
          />
          <p id="clave-minimo" className="text-meta text-faint">
            Mínimo {CLAVE_MINIMA} caracteres.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password2">Repite la clave</Label>
          <Input
            id="password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            minLength={CLAVE_MINIMA}
            required
            aria-invalid={state.error ? true : undefined}
          />
        </div>
      </div>

      <ErrorNotice message={state.error} className="mt-3" />

      <Button type="submit" size="lg" disabled={pending} className="mt-5 w-full">
        {pending ? (
          <>
            <Spinner className="size-[18px]" aria-hidden />
            Guardando…
          </>
        ) : (
          "Guardar y entrar"
        )}
      </Button>
    </form>
  );
}
