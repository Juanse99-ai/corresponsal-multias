"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatCOP, formatMiles } from "@/lib/format";
import { useMontado } from "@/lib/use-montado";
import { entradaEnPantalla, finDeEntrada } from "@/lib/entrada";
import { reduced } from "@/components/fx/reduced";
import { cn } from "@/lib/utils";

/** Duración de una cuenta: 600 ms con frenado cúbico, como el taller. */
const DURACION = 600;
/** Si la cifra no se ve en 2 s (otra pestaña, más abajo), se escribe la final. */
const ESPERA_VISTA = 2000;

const frenar = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Cifra de pesos que cuenta (solo en cifras de titular: cabecera, tarjeta,
 * totales del día; nunca en campos ni en celdas de tabla).
 * - Al aparecer en pantalla sube desde 0; si en 2 s no se ve, sale la final.
 * - Cuando cambia, rueda del valor que se ve al nuevo, pasando solo por enteros.
 * - El texto se escribe directo en el nodo: cada cuadro no repinta el componente.
 * - Con `desdeCero={false}` (totales de un formulario) solo rueda al cambiar.
 * - Recién abierta la app, el HTML del servidor ya trae la cifra: solo cuenta
 *   si la entrada del logo la tapa (y empieza cuando se va). Nunca se ve una
 *   cifra que no es.
 * Con reducir movimiento, el valor final de una.
 */
export function AnimatedMoney({
  value,
  className,
  withSign = true,
  desdeCero = true,
}: {
  value: number;
  className?: string;
  withSign?: boolean;
  desdeCero?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const montado = useMontado();
  // false si nació hidratando el HTML del servidor; true si nació en el navegador.
  const [nacioEnCliente] = useState(montado);
  // El texto inicial no cambia: React no vuelve a tocar el nodo; lo escribe el efecto.
  const [inicial] = useState(() => (withSign ? formatCOP(Math.round(value)) : formatMiles(Math.round(value))));
  const mostrado = useRef<number | null>(null);
  const visto = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = withSign ? formatCOP : formatMiles;
    const hasta = Math.round(value);
    const pintar = (n: number) => {
      mostrado.current = n;
      el.textContent = fmt(n);
    };
    if (reduced()) {
      visto.current = true;
      pintar(hasta);
      return;
    }

    let vigente = true;
    let cuadro = 0;
    let tope = 0;
    let io: IntersectionObserver | null = null;

    const correr = () => {
      visto.current = true;
      const desde = mostrado.current ?? hasta;
      if (desde === hasta) {
        pintar(hasta);
        return;
      }
      const t0 = performance.now();
      const paso = (t: number) => {
        const k = (t - t0) / DURACION;
        pintar(k >= 1 ? hasta : Math.round(desde + (hasta - desde) * frenar(k)));
        if (k < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    };

    if (visto.current) {
      correr();
    } else {
      const tapada = !nacioEnCliente && entradaEnPantalla();
      const contar = desdeCero && (nacioEnCliente || tapada);
      if (!contar) {
        visto.current = true;
        pintar(hasta);
      } else {
        if (mostrado.current == null) pintar(0);
        const esperarVista = () => {
          if (!vigente) return;
          if (typeof IntersectionObserver !== "function") return correr();
          io = new IntersectionObserver((entradas) => {
            if (!entradas.some((e) => e.isIntersecting)) return;
            io?.disconnect();
            io = null;
            clearTimeout(tope);
            correr();
          });
          io.observe(el);
          tope = window.setTimeout(() => {
            io?.disconnect();
            io = null;
            visto.current = true;
            pintar(hasta);
          }, ESPERA_VISTA);
        };
        if (tapada) void finDeEntrada().then(esperarVista);
        else esperarVista();
      }
    }
    // Al cortarse (valor nuevo o la pantalla se va) no salta al final: la
    // cuenta siguiente sale de lo que se estaba viendo.
    return () => {
      vigente = false;
      cancelAnimationFrame(cuadro);
      io?.disconnect();
      clearTimeout(tope);
    };
  }, [value, withSign, desdeCero, nacioEnCliente]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {inicial}
    </span>
  );
}
