"use client";

import * as React from "react";
import { CaretRight, Check, CircleNotch, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const UMBRAL = 0.85;
const VELOCIDAD = 0.5;

/**
 * Deslizar para confirmar (Biela, 8 nov 2026: el dueño pidió cerrar la caja con
 * un gesto, en el centro de la tarjeta): como «deslizar para apagar» del
 * iPhone. El círculo se arrastra hasta el final; si se suelta antes vuelve a
 * su sitio, y un tirón rápido también cuenta (más de 0,5 px/ms). El gesto es
 * la confirmación. Con el teclado, Enter o Espacio llaman a `onTeclado` (la
 * confirmación de siempre), porque arrastrar no es posible ahí.
 *
 *   <Deslizar texto="Cerrar el día" apagado="Escribe la tirilla" onListo={cerrar}
 *     onTeclado={pedirConfirmacion} cargando={cerrando} hecho={cerrado} textoHecho="Día cerrado" />
 *
 * `apagado` deja la pastilla quieta y dice qué falta. Quien lo usa le cambia
 * la `key` cuando vuelve a estar listo: así arranca de cero.
 */
export function Deslizar({
  texto,
  apagado = "",
  onListo,
  onTeclado,
  cargando = false,
  hecho = false,
  textoHecho = "Listo",
  icono,
  className,
}: {
  texto: string;
  apagado?: string;
  onListo: () => void;
  onTeclado?: () => void;
  cargando?: boolean;
  hecho?: boolean;
  textoHecho?: string;
  icono?: React.ReactNode;
  className?: string;
}) {
  const pista = React.useRef<HTMLDivElement>(null);
  const bola = React.useRef<HTMLButtonElement>(null);
  const arrastre = React.useRef<{ x0: number; t0: number; max: number; id: number } | null>(null);
  const [x, setX] = React.useState(0);
  const [suelto, setSuelto] = React.useState(true);
  const [tope, setTope] = React.useState(0);
  const quieto = !!apagado || cargando || hecho;
  const fin = cargando || hecho;

  const maximo = () => {
    const p = pista.current?.getBoundingClientRect();
    const b = bola.current?.getBoundingClientRect();
    return p && b ? Math.max(0, p.width - b.width - 8) : 0;
  };

  const empezar = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (quieto || arrastre.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const m = maximo();
    arrastre.current = { x0: e.clientX, t0: performance.now(), max: m, id: e.pointerId };
    setTope(m);
    setSuelto(false);
  };
  const mover = (e: React.PointerEvent<HTMLButtonElement>) => {
    const a = arrastre.current;
    if (!a || e.pointerId !== a.id) return;
    setX(Math.min(a.max, Math.max(0, e.clientX - a.x0)));
  };
  const soltar = (e: React.PointerEvent<HTMLButtonElement>) => {
    const a = arrastre.current;
    if (!a || e.pointerId !== a.id) return;
    arrastre.current = null;
    const recorrido = Math.min(a.max, Math.max(0, e.clientX - a.x0));
    const velocidad = recorrido / Math.max(1, performance.now() - a.t0);
    setSuelto(true);
    if (a.max > 0 && (recorrido >= a.max * UMBRAL || (velocidad > VELOCIDAD && recorrido > a.max * 0.35))) {
      setX(a.max);
      onListo();
    } else {
      setX(0);
    }
  };

  const avance = tope ? Math.min(1, x / tope) : 0;

  return (
    <div
      ref={pista}
      data-slot="deslizar"
      className={cn("dz", quieto && "dz--quieto", fin && "dz--fin", hecho && "dz--hecho", apagado && "dz--apagado", className)}
      style={{ "--dz-x": `${x}px`, "--dz-avance": avance } as React.CSSProperties}
    >
      <span className="dz__relleno" aria-hidden />
      <span className="dz__texto" aria-hidden>
        {hecho ? (
          textoHecho
        ) : apagado ? (
          apagado
        ) : (
          <>
            {texto}
            <span className="dz__pista">
              <CaretRight size={14} weight="bold" />
              <CaretRight size={14} weight="bold" />
            </span>
          </>
        )}
      </span>
      <button
        ref={bola}
        type="button"
        className={cn("dz__bola", suelto && "dz__bola--suelta")}
        aria-label={hecho ? textoHecho : apagado || `${texto}: desliza hasta el final o pulsa Enter`}
        disabled={!!apagado || cargando || hecho}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTeclado?.();
          }
        }}
      >
        {hecho ? (
          <Check size={18} weight="bold" />
        ) : cargando ? (
          <CircleNotch size={18} weight="bold" className="dz__gira" />
        ) : (
          icono ?? <LockSimple size={18} weight="bold" />
        )}
      </button>
    </div>
  );
}
