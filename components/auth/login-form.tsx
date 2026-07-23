"use client";

import { useActionState } from "react";
import { ArrowRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { signInAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initial);

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

      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      {state.error && (
        <div className="flex items-center gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.82rem] text-danger">
          <Warning size={16} weight="fill" className="shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Entrando…" : "Entrar"}
        {!pending && <ArrowRight size={18} weight="bold" />}
      </Button>
    </form>
  );
}
