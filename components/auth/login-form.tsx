"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Info } from "@phosphor-icons/react/dist/ssr";
import { signInAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";

const initial: LoginState = { error: null };

// text-base (16px): con menos, iOS hace zoom al enfocar el campo.
// Input de shadcn sin caja propia: el recuadro lo pone el grupo de afuera.
const campo =
  "h-full w-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent";
const fila = "flex h-[3.375rem] items-center gap-2.5 px-4";
const etiqueta = "w-[5.75rem] shrink-0 text-[0.95rem] leading-normal font-medium text-text";

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
      {/* Usuario y contraseña en un solo recuadro, como los ajustes del iPhone. */}
      <div className="overflow-hidden rounded-[1.1rem] border border-line-strong bg-surface shadow-[0_1px_2px_oklch(0.4_0.05_258/0.06)] transition-[border-color,box-shadow] duration-200 focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_oklch(0.515_0.172_258/0.12)]">
        <div className={fila}>
          <Label htmlFor="email" className={etiqueta}>Usuario</Label>
          <Input
            ref={usuarioRef}
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ivana o correo"
            required
            className={campo}
          />
        </div>
        <Separator className="bg-line" />
        <div className={cn(fila, state.error && "bg-danger/5")}>
          <Label htmlFor="password" className={etiqueta}>Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Requerida"
            required
            className={campo}
          />
          <Button
            variant="link"
            onMouseDown={sinSoltarFoco}
            onClick={() => setOlvido(true)}
            className="-mr-2 h-11 shrink-0 px-2 text-[0.9rem] hover:no-underline hover:text-accent-strong"
          >
            ¿Olvidaste?
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {olvido && (
          <Alert variant="muted" className="mt-2.5">
            <Info weight="fill" />
            <AlertDescription className="text-[0.85rem] leading-snug">Pídele a Juan que te la restablezca.</AlertDescription>
          </Alert>
        )}
      </div>

      <ErrorNotice message={state.error} className="mt-3" />

      <Button type="submit" size="lg" disabled={pending} onMouseDown={sinSoltarFoco} className="mt-5 h-[3.375rem] w-full text-base">
        {pending ? (
          <>
            <Spinner className="size-[18px]" aria-hidden />
            Entrando…
          </>
        ) : (
          <>
            Entrar
            <ArrowRight size={18} weight="bold" />
          </>
        )}
      </Button>
    </form>
  );
}
