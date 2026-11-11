"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Backspace } from "@phosphor-icons/react/dist/ssr";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@/components/ui/error-notice";
import { EscenaEntrar, type FaseEntrar } from "@/components/fx/escena-entrar";
import { iniciales } from "@/components/shell/riel-panel";
import {
  crearMiClave,
  crearPrimeraClave,
  entrarConClave,
  revisarClaveNueva,
  type Resultado,
} from "@/app/caja/actions";
import { entrarConPaso } from "@/lib/paso-entrar";
import { LARGO_CLAVE } from "@/lib/caja-cookie";
import { cn, esEnter } from "@/lib/utils";

interface Persona {
  id: string;
  nombre: string;
  /** false: primera vez, crea su clave. */
  tieneClave: boolean;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SIN_RED = "Sin conexión. Revisa el internet e intenta otra vez.";
const sinRed = (): Resultado => ({ ok: false, error: SIN_RED });
// Con el campo enfocado la banda de arriba se encoge; si el botón le quitara el
// foco, la banda crecería y el botón se correría antes de soltar: el toque se
// perdería (igual que en login-form.tsx).
const sinSoltarFoco = (e: React.MouseEvent) => e.preventDefault();

/** Con la buena: la misma escena y el mismo paso al Panel que entrar con correo. */
function usePasar() {
  const router = useRouter();
  return useCallback(() => entrarConPaso(() => router.replace("/panel")), [router]);
}

function useSacudir() {
  const ref = useRef<HTMLDivElement>(null);
  const sacudir = useCallback(() => {
    navigator.vibrate?.(60);
    const el = ref.current;
    if (!el) return;
    el.classList.remove("t-shake");
    void el.offsetWidth;
    el.classList.add("t-shake");
  }, []);
  return [ref, sacudir] as const;
}

/**
 * Entrada de caja: se toca quién es y se marca la clave de 6 números en el
 * teclado (o con el teclado del computador). Al completar los 6 se envía sola.
 * Quien aún no tiene clave la crea ahí mismo (con su contraseña una vez).
 */
export function CajaClave({ personas }: { personas: Persona[] }) {
  const [persona, setPersona] = useState<Persona | null>(personas.length === 1 ? personas[0] : null);
  const volver = personas.length > 1 ? () => setPersona(null) : undefined;

  if (personas.length === 0) {
    return <p className="text-body text-text-2">No hay personas activas</p>;
  }

  if (!persona) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {personas.map((p) => (
          <Button
            key={p.id}
            variant="ghost"
            className="h-auto flex-col gap-2 rounded-3xl px-1 py-3.5 hover:bg-fill"
            onClick={() => setPersona(p)}
          >
            <Avatar className="size-14">
              <AvatarFallback
                className={cn(
                  "text-title font-semibold",
                  p.tieneClave ? "bg-accent-fill text-accent-ink" : "bg-surface-2 text-muted",
                )}
              >
                {iniciales(p.nombre)}
              </AvatarFallback>
            </Avatar>
            <span className="flex w-full flex-col leading-tight">
              <span className="truncate text-body font-medium text-text">{p.nombre.split(/\s+/)[0]}</span>
              {!p.tieneClave && <span className="text-meta font-normal text-muted">Sin clave</span>}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  const cabecera = <Cabecera persona={persona} volver={volver} />;
  if (!persona.tieneClave) {
    return (
      <CrearClave
        key={persona.id}
        cabecera={cabecera}
        pedirContrasena
        onEscape={volver}
        guardar={(clave, contrasena) => crearPrimeraClave(persona.id, contrasena, clave)}
      />
    );
  }
  return <MarcarClave key={persona.id} persona={persona} cabecera={cabecera} onEscape={volver} />;
}

/** Ya adentro con correo, primera vez: crea la clave y sigue al Panel. */
export function CrearMiClave() {
  return <CrearClave guardar={(clave) => crearMiClave(clave)} />;
}

function MarcarClave({
  persona,
  cabecera,
  onEscape,
}: {
  persona: Persona;
  cabecera: React.ReactNode;
  onEscape?: () => void;
}) {
  const pasar = usePasar();
  const [digitos, setDigitos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pending, startTransition] = useTransition();
  const [puntosRef, sacudir] = useSacudir();
  const fase: FaseEntrar = listo ? "ok" : pending ? "espera" : "reposo";

  const marcar = (d: string) => {
    if (pending || listo || digitos.length >= LARGO_CLAVE) return;
    setError(null);
    const clave = digitos + d;
    setDigitos(clave);
    if (clave.length < LARGO_CLAVE) return;
    startTransition(async () => {
      const res = await entrarConClave(persona.id, clave).catch(sinRed);
      if (res.ok) {
        setListo(true);
        return;
      }
      setDigitos("");
      setError(res.error ?? "No se pudo entrar.");
      sacudir();
    });
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <EscenaEntrar fase={fase} alTerminar={pasar} />
      {cabecera}
      <Marcador
        digitos={digitos}
        error={error}
        deshabilitado={pending}
        puntosRef={puntosRef}
        onMarcar={marcar}
        onBorrar={() => setDigitos((v) => v.slice(0, -1))}
        onEscape={onEscape}
      />
    </div>
  );
}

type Paso = "contrasena" | "nueva" | "repite";

/**
 * Crear la clave: (contraseña de siempre, si hace falta) → 6 números →
 * repetirlos. Las obvias se rechazan antes de pedir que la repita.
 */
function CrearClave({
  cabecera,
  pedirContrasena = false,
  guardar,
  onEscape,
}: {
  cabecera?: React.ReactNode;
  pedirContrasena?: boolean;
  guardar: (clave: string, contrasena: string) => Promise<Resultado>;
  onEscape?: () => void;
}) {
  const pasar = usePasar();
  const [paso, setPaso] = useState<Paso>(pedirContrasena ? "contrasena" : "nueva");
  const [contrasena, setContrasena] = useState("");
  const [nueva, setNueva] = useState("");
  const [digitos, setDigitos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [pending, startTransition] = useTransition();
  const [puntosRef, sacudir] = useSacudir();
  const fase: FaseEntrar = listo ? "ok" : guardando ? "espera" : "reposo";

  const fallo = (mensaje: string, volverA: Paso) => {
    setDigitos("");
    setError(mensaje);
    setPaso(volverA);
    sacudir();
  };

  const guardarCon = (clave: string, conContrasena: string) => {
    setError(null);
    setGuardando(true);
    startTransition(async () => {
      const res = await guardar(clave, conContrasena).catch(sinRed);
      if (res.ok) {
        setListo(true);
        return;
      }
      setGuardando(false);
      // Contraseña mala: se corrige y se guarda la misma clave, sin marcarla otra vez.
      if (res.error === "Contraseña incorrecta.") {
        setContrasena("");
        setError(res.error);
        setPaso("contrasena");
        return;
      }
      setNueva("");
      fallo(res.error ?? "No se pudo guardar.", "nueva");
    });
  };

  const seguir = () => {
    if (!contrasena || pending) return;
    if (nueva) guardarCon(nueva, contrasena);
    else {
      setError(null);
      setPaso("nueva");
    }
  };

  const marcar = (d: string) => {
    if (pending || listo || digitos.length >= LARGO_CLAVE) return;
    setError(null);
    const clave = digitos + d;
    setDigitos(clave);
    if (clave.length < LARGO_CLAVE) return;
    if (paso === "repite") {
      if (clave !== nueva) {
        setNueva("");
        fallo("No son iguales. Márcala otra vez.", "nueva");
        return;
      }
      guardarCon(clave, contrasena);
      return;
    }
    startTransition(async () => {
      const mal = await revisarClaveNueva(clave).catch(() => SIN_RED);
      if (mal) {
        fallo(mal, "nueva");
        return;
      }
      setNueva(clave);
      setDigitos("");
      setPaso("repite");
    });
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <EscenaEntrar fase={fase} alTerminar={pasar} />
      {cabecera}
      {paso === "contrasena" ? (
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="contrasena">Tu contraseña</Label>
              <Button
                asChild
                variant="link"
                className="-my-3 h-11 px-1 text-body font-medium hover:no-underline hover:text-accent-strong"
              >
                <Link href="/recuperar">¿Olvidaste?</Link>
              </Button>
            </div>
            <Input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              onKeyDown={(e) => esEnter(e) && seguir()}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <ErrorNotice message={error} />
          <Button
            size="lg"
            className="w-full"
            onMouseDown={sinSoltarFoco}
            onClick={seguir}
            disabled={!contrasena || pending}
          >
            {nueva ? "Guardar" : "Seguir"}
            <ArrowRight weight="bold" />
          </Button>
        </div>
      ) : (
        <>
          <p className="text-body font-medium text-text-2">{paso === "nueva" ? "Crea tu clave" : "Repítela"}</p>
          <Marcador
            digitos={digitos}
            error={error}
            deshabilitado={pending}
            puntosRef={puntosRef}
            onMarcar={marcar}
            onBorrar={() => setDigitos((v) => v.slice(0, -1))}
            onEscape={onEscape}
          />
        </>
      )}
    </div>
  );
}

function Cabecera({ persona, volver }: { persona: Persona; volver?: () => void }) {
  return (
    <div className="flex w-full items-center gap-3">
      {volver && (
        <Button variant="ghost" size="icon" aria-label="Cambiar de persona" className="shrink-0" onClick={volver}>
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
  );
}

/** Los 6 puntos y el teclado. También el del computador: números, borrar y Esc. */
function Marcador({
  digitos,
  error,
  deshabilitado,
  puntosRef,
  onMarcar,
  onBorrar,
  onEscape,
}: {
  digitos: string;
  error: string | null;
  deshabilitado: boolean;
  puntosRef: React.RefObject<HTMLDivElement | null>;
  onMarcar: (d: string) => void;
  onBorrar: () => void;
  onEscape?: () => void;
}) {
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) onMarcar(e.key);
      else if (e.key === "Backspace") onBorrar();
      else if (e.key === "Escape") onEscape?.();
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [onMarcar, onBorrar, onEscape]);

  return (
    <>
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
          <Tecla key={d} onClick={() => onMarcar(d)} disabled={deshabilitado}>
            {d}
          </Tecla>
        ))}
        <span aria-hidden />
        <Tecla onClick={() => onMarcar("0")} disabled={deshabilitado}>
          0
        </Tecla>
        <Button
          variant="ghost"
          aria-label="Borrar"
          className="h-16 rounded-full text-muted hover:bg-fill"
          onClick={onBorrar}
          disabled={deshabilitado || digitos.length === 0}
        >
          <Backspace size={26} />
        </Button>
      </div>
    </>
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
