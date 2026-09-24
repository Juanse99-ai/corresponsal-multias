"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Info } from "@phosphor-icons/react/dist/ssr";
import { signInAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";

const initial: LoginState = { error: null };

// text-base (16px): con menos, iOS hace zoom al enfocar el campo.
const campo =
  "h-full w-0 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-faint";
const fila = "flex h-[3.375rem] items-center gap-2.5 px-4";
const etiqueta = "w-[5.75rem] shrink-0 text-[0.95rem] font-medium text-text";

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
          <label htmlFor="email" className={etiqueta}>Usuario</label>
          <input
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
        <div className={cn(fila, "border-t border-line", state.error && "bg-danger/5")}>
          <label htmlFor="password" className={etiqueta}>Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Requerida"
            required
            className={campo}
          />
          <button
            type="button"
            onMouseDown={sinSoltarFoco}
            onClick={() => setOlvido(true)}
            className="-mr-2 h-11 shrink-0 rounded-full px-2 text-[0.9rem] font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
          >
            ¿Olvidaste?
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {olvido && (
          <p className="mt-2.5 flex items-start gap-2 px-1 text-[0.85rem] leading-snug text-muted">
            <Info size={16} weight="fill" className="mt-px shrink-0 text-faint" />
            Pídele a Juan que te la restablezca.
          </p>
        )}
      </div>

      <ErrorNotice message={state.error} className="mt-3" />

      <Button type="submit" size="lg" disabled={pending} onMouseDown={sinSoltarFoco} className="mt-5 h-[3.375rem] w-full text-base">
        {pending ? (
          <>
            <span aria-hidden className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-current border-t-transparent opacity-70" />
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
