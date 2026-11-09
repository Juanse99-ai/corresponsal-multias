"use client";

import { useActionState, useEffect, useRef } from "react";
import { signInAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@/components/ui/error-notice";
import { COMPUTADOR } from "@/lib/cortes";

const initial: LoginState = { error: null };

// Con un campo enfocado en el celular la banda de arriba se encoge. Si al tocar un
// botón el campo soltara el foco, la banda crecería y el botón se correría antes de
// soltar el dedo: el toque se perdería. Así el foco se queda donde estaba.
const sinSoltarFoco = (e: React.MouseEvent) => e.preventDefault();

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initial);
  const usuarioRef = useRef<HTMLInputElement>(null);

  // Solo en el PC: en el celular, enfocar al abrir saca el teclado y tapa la marca.
  useEffect(() => {
    if (window.matchMedia(COMPUTADOR).matches) usuarioRef.current?.focus();
  }, []);

  return (
    <form action={action} className="flex w-full flex-col">
      {/* Campos en pastilla de 52 como el ingreso de Biela, sin rótulo a la
          vista (queda para el lector de pantalla). Letra de 16 en el celular:
          con menos, iOS hace zoom al enfocar. */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="email" className="sr-only">
          Usuario
        </Label>
        <Input
          ref={usuarioRef}
          id="email"
          name="email"
          type="text"
          placeholder="Usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-[52px] rounded-full px-[22px] lg:text-title"
        />
        <Label htmlFor="password" className="sr-only">
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          className="h-[52px] rounded-full px-[22px] lg:text-title"
        />
      </div>

      <ErrorNotice message={state.error} className="mt-3" />

      <Button type="submit" cargando={pending} onMouseDown={sinSoltarFoco} className="mt-4 h-[52px] w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
