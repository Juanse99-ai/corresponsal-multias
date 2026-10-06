"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { signInAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice } from "@/components/ui/error-notice";

const initial: LoginState = { error: null };

// Con un campo enfocado en el celular la banda de arriba se encoge. Si al tocar un
// botón el campo soltara el foco, la banda crecería y el botón se correría antes de
// soltar el dedo: el toque se perdería. Así el foco se queda donde estaba.
const sinSoltarFoco = (e: React.MouseEvent) => e.preventDefault();

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initial);
  const [olvido, setOlvido] = useState(false);
  const usuarioRef = useRef<HTMLInputElement>(null);

  // Solo en el PC: en el celular, enfocar al abrir saca el teclado y tapa la marca.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) usuarioRef.current?.focus();
  }, []);

  return (
    <form action={action} className="flex w-full flex-col">
      {/* Campos con el dibujo de la app: rellenos, con el rótulo encima.
          text-base (16px) en el campo: con menos, iOS hace zoom al enfocar. */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Usuario</Label>
          <Input
            ref={usuarioRef}
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Contraseña</Label>
            {/* Toque de 44 sin agrandar la fila del rótulo. */}
            <Button
              variant="link"
              onMouseDown={sinSoltarFoco}
              onClick={() => setOlvido(true)}
              className="-my-3 h-11 px-1 text-body font-medium hover:no-underline hover:text-accent-strong"
            >
              ¿Olvidaste?
            </Button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.error ? true : undefined}
          />
        </div>
      </div>

      <div aria-live="polite">
        {olvido && (
          <Alert variant="muted" className="mt-3">
            <Info weight="fill" />
            <AlertDescription>Pídele a Juan que te la restablezca.</AlertDescription>
          </Alert>
        )}
      </div>

      <ErrorNotice message={state.error} className="mt-3" />

      <Button type="submit" size="lg" disabled={pending} onMouseDown={sinSoltarFoco} className="mt-5 w-full">
        {pending ? (
          <>
            <Spinner className="size-[18px]" aria-hidden />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
