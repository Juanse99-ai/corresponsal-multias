"use client";

import { useEffect, useState } from "react";
import { CalendarBlank, Clock } from "@phosphor-icons/react/dist/ssr";
import { useMontado } from "@/lib/use-montado";
import { saludoHora } from "@/lib/saludos";
import { cn } from "@/lib/utils";

const ZONA = "America/Bogota";
const FECHA = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
const HORA = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });
const HORA24 = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" });

const fechaLarga = (d: Date) => {
  const t = FECHA.format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const horaCorta = (d: Date) => HORA.format(d).replace(/\s/g, " ");

/** La hora de Bogotá, que avanza cada 20 s. null en el servidor. */
function useAhora() {
  const montado = useMontado();
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 20_000);
    return () => window.clearInterval(t);
  }, []);
  return montado ? ahora : null;
}

/** La pastilla de arriba al centro del ingreso: la fecha y la hora (solo en el computador). */
export function HoyPastilla() {
  const ahora = useAhora();
  return (
    <div
      aria-hidden
      className="absolute top-6 left-1/2 z-[1] hidden min-h-11 -translate-x-1/2 items-center gap-1 rounded-full bg-bg-soft p-1 lg:flex"
    >
      <span className="tnum inline-flex min-h-9 items-center gap-2 px-4 text-body font-medium whitespace-nowrap text-text-2">
        <CalendarBlank size={16} className="text-muted" />
        {ahora ? fechaLarga(ahora) : " "}
      </span>
      <span className="tnum inline-flex min-h-9 items-center gap-2 px-4 text-body font-medium whitespace-nowrap text-text-2">
        <Clock size={16} className="text-muted" />
        {ahora ? horaCorta(ahora) : " "}
      </span>
    </div>
  );
}

/** La fecha sobre el saludo, en tablet y celular. */
export function Fecha({ className }: { className?: string }) {
  const ahora = useAhora();
  return <span className={cn(className)}>{ahora ? fechaLarga(ahora) : " "}</span>;
}

/** El saludo según la hora de Bogotá. Antes de hidratar, "Hola". */
export function Saludo() {
  const ahora = useAhora();
  return <>{ahora ? saludoHora(Number(HORA24.format(ahora))) : "Hola"}</>;
}
