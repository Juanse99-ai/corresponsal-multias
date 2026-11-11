"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Backspace } from "@phosphor-icons/react/dist/ssr";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { EscenaEntrar, type FaseEntrar } from "@/components/fx/escena-entrar";
import { iniciales } from "@/components/shell/riel-panel";
import { entrarConClave } from "@/app/caja/actions";
import { entrarConPaso } from "@/lib/paso-entrar";
import { LARGO_CLAVE } from "@/lib/caja-cookie";
import { cn } from "@/lib/utils";

interface Persona {
  id: string;
  nombre: string;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Entrada de caja: se toca quién es y se marca la clave de 6 números en el
 * teclado (o con el teclado del computador). Al completar los 6 se envía sola.
 * Con la buena, la misma escena y el mismo paso al Panel que entrar con correo.
 */
export function CajaClave({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(personas.length === 1 ? personas[0] : null);
  const [digitos, setDigitos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pending, startTransition] = useTransition();
  const puntosRef = useRef<HTMLDivElement>(null);

  const fase: FaseEntrar = listo ? "ok" : pending ? "espera" : "reposo";
  const pasar = useCallback(() => entrarConPaso(() => router.replace("/panel")), [router]);

  const sacudir = () => {
    const el = puntosRef.current;
    if (!el) return;
    el.classList.remove("t-shake");
    void el.offsetWidth;
    el.classList.add("t-shake");
  };

  const enviar = useCallback(
    (clave: string) => {
      if (!persona) return;
      setError(null);
      startTransition(async () => {
        const res = await entrarConClave(persona.id, clave).catch(() => ({
          ok: false,
          error: "Sin conexión. Revisa el internet e intenta otra vez.",
        }));
        if (res.ok) {
          setListo(true);
          return;
        }
        setDigitos("");
        setError(res.error ?? "No se pudo entrar.");
        navigator.vibrate?.(60);
        sacudir();
      });
    },
    [persona],
  );

  const marcar = useCallback(
    (d: string) => {
      if (pending || listo || digitos.length >= LARGO_CLAVE) return;
      setError(null);
      const nuevo = digitos + d;
      setDigitos(nuevo);
      if (nuevo.length === LARGO_CLAVE) enviar(nuevo);
    },
    [pending, listo, digitos, enviar],
  );
  const borrar = useCallback(() => setDigitos((v) => v.slice(0, -1)), []);

  // Teclado del computador: números, borrar y Esc para volver a las personas.
  useEffect(() => {
    if (!persona) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) marcar(e.key);
      else if (e.key === "Backspace") borrar();
      else if (e.key === "Escape" && personas.length > 1) {
        setPersona(null);
        setDigitos("");
        setError(null);
      }
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [persona, personas.length, marcar, borrar]);

  if (personas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-text-2">Nadie tiene clave de caja todavía. Entra con tu correo y ponla en Tú, Clave de caja.</p>
        <Button asChild>
          <Link href="/login">Entrar con correo</Link>
        </Button>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2.5">
          {personas.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              className="h-auto flex-col gap-2 rounded-3xl px-1 py-3.5 hover:bg-fill"
              onClick={() => setPersona(p)}
            >
              <Avatar className="size-14">
                <AvatarFallback className="bg-accent-fill text-title font-semibold text-accent-ink">
                  {iniciales(p.nombre)}
                </AvatarFallback>
              </Avatar>
              <span className="w-full truncate text-body font-medium text-text">{p.nombre.split(/\s+/)[0]}</span>
            </Button>
          ))}
        </div>
        <Button asChild variant="link" className="self-center">
          <Link href="/login">Entrar con correo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <EscenaEntrar fase={fase} alTerminar={pasar} />
      <div className="flex w-full items-center gap-3">
        {personas.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cambiar de persona"
            className="shrink-0"
            onClick={() => {
              setPersona(null);
              setDigitos("");
              setError(null);
            }}
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <Avatar className="size-11">
          <AvatarFallback className="bg-accent-fill text-body font-semibold text-accent-ink">
            {iniciales(persona.nombre)}
          </AvatarFallback>
        </Avatar>
        <p className="min-w-0 truncate text-title font-semibold text-text">{persona.nombre}</p>
      </div>

      {/* Los 6 puntos: llenos los marcados. */}
      <div
        ref={puntosRef}
        role="status"
        aria-label={`${digitos.length} de ${LARGO_CLAVE} números`}
        className="flex items-center gap-3.5 py-2"
      >
        {Array.from({ length: LARGO_CLAVE }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "size-3.5 rounded-full border-[1.5px] transition-colors duration-[var(--dur-1)]",
              i < digitos.length ? "border-text bg-text" : "border-borde-boton bg-transparent",
              error && "border-bad-fg",
            )}
          />
        ))}
      </div>

      <ErrorNotice message={error} className="w-full" />

      <div className="grid w-full max-w-[300px] grid-cols-3 gap-3">
        {TECLAS.map((d) => (
          <Tecla key={d} onClick={() => marcar(d)} disabled={pending}>
            {d}
          </Tecla>
        ))}
        <span aria-hidden />
        <Tecla onClick={() => marcar("0")} disabled={pending}>
          0
        </Tecla>
        <Button
          variant="ghost"
          aria-label="Borrar"
          className="h-16 rounded-full text-muted hover:bg-fill"
          onClick={borrar}
          disabled={pending || digitos.length === 0}
        >
          <Backspace size={26} />
        </Button>
      </div>
    </div>
  );
}

function Tecla({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className="tnum h-16 rounded-full text-[26px] font-normal text-text"
    >
      {children}
    </Button>
  );
}
