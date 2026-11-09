"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Contador } from "@/components/ui/contador";
import { cn } from "@/lib/utils";

/**
 * Cajón que se recoge (Biela, 8 nov 2026, opción B que eligió el dueño entre
 * cinco, como Linear y Stripe): todo el encabezado se toca, con el mouse
 * encima se sombrea entero (inset de 4 px, esquina de 20 en la tarjeta) y la
 * flecha pequeña y gris va al final, abajo abierta y a la derecha cerrada.
 * Recogido queda solo el encabezado con su cifra (`cifra`) o su pista. El
 * contador va junto al título y las acciones afuera del botón (nunca un botón
 * dentro de otro).
 * - variante "tarjeta": la tarjeta entera (título 15/500).
 * - variante "fila": un renglón dentro de otra tarjeta o ventana (13,5/500,
 *   40 de alto; 44 en el celular).
 * Lo que el usuario recoge se recuerda en su equipo con `usePlegadas`; los
 * historiales arrancan recogidos siempre (CLAUDE.md, «Cajones que se recogen»).
 */
export function Plegable({
  titulo,
  icono,
  pista,
  pistaSiempre = false,
  contador,
  tono,
  cifra,
  acciones,
  variante = "tarjeta",
  abierto,
  onAbiertoChange,
  defaultAbierto = false,
  className,
  children,
}: {
  titulo: React.ReactNode;
  /** Ícono antes del título (con su tono, lib/tonos.ts). */
  icono?: React.ReactNode;
  pista?: React.ReactNode;
  /** La pista se ve también abierto. */
  pistaSiempre?: boolean;
  contador?: number | string | null;
  tono?: "aviso" | "peligro";
  /** La cifra del cajón: se lee a la derecha, también recogido. */
  cifra?: React.ReactNode;
  acciones?: React.ReactNode;
  variante?: "tarjeta" | "fila";
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
  defaultAbierto?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [local, setLocal] = React.useState(defaultAbierto);
  const controlado = abierto !== undefined;
  const open = controlado ? abierto : local;
  const cambiar = (v: boolean) => {
    if (!controlado) setLocal(v);
    onAbiertoChange?.(v);
  };
  const verPista = pista != null && pista !== "" && pista !== false && (pistaSiempre || !open);
  const tarjeta = variante === "tarjeta";
  const Encabezado = tarjeta ? "h2" : "h3";

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={cambiar}
      data-slot="plegable"
      data-variante={variante}
      className={cn(
        tarjeta && "rounded-3xl border border-[var(--tarjeta-borde)] bg-card text-card-foreground shadow-[var(--tarjeta-sombra)]",
        className,
      )}
    >
      <div
        className={cn(
          "cajon-cabeza flex min-w-0 items-center gap-2.5 transition-colors duration-[var(--dur-1)]",
          tarjeta ? "m-1 rounded-[20px]" : "rounded-xl",
        )}
      >
        {/* Títulos en escalera (Biela, 19 oct 2026): el de la página es el único
            h1; el de cada cajón, h2, y el de un renglón dentro, h3. */}
        <Encabezado className="m-0 flex min-w-0 flex-1 font-[inherit]">
        <CollapsiblePrimitive.Trigger
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid",
            tarjeta ? "min-h-[52px] rounded-[20px] py-3 pl-3.5 sm:pl-4" : "min-h-11 rounded-xl py-1.5 lg:min-h-10",
          )}
        >
          {icono && <span className="flex shrink-0 items-center">{icono}</span>}
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "min-w-0 truncate font-medium text-text",
                  tarjeta ? "text-title tracking-[-0.2px]" : "text-body",
                )}
              >
                {titulo}
              </span>
              <Contador n={contador} tono={tono} />
            </span>
            {verPista && <span className="line-clamp-2 text-meta text-muted">{pista}</span>}
          </span>
        </CollapsiblePrimitive.Trigger>
        </Encabezado>
        {cifra != null && cifra !== false && (
          <span className="tnum shrink-0 text-title font-medium text-text">{cifra}</span>
        )}
        {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        <CollapsiblePrimitive.Trigger
          tabIndex={-1}
          aria-hidden
          className={cn("cajon-fin grid size-6 shrink-0 cursor-pointer place-items-center text-muted", tarjeta ? "mr-3.5" : "mr-1")}
        >
          <CaretDown
            weight="bold"
            className="cajon-flecha size-3.5"
          />
        </CollapsiblePrimitive.Trigger>
      </div>
      <CollapsiblePrimitive.Content
        className={cn("plegable-cuerpo overflow-hidden", tarjeta && "border-t border-line")}
      >
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

function leerPlegadas(clave: string): Record<string, boolean> {
  try {
    const g = JSON.parse(localStorage.getItem(clave) || "{}");
    return g && typeof g === "object" ? g : {};
  } catch {
    return {};
  }
}

/**
 * Cajones que se dejaron recogidos en una pantalla. Es una preferencia de cada
 * equipo (localStorage, una clave por pantalla): sin almacenamiento, o con el
 * guardado dañado, salen todos abiertos. Los historiales no pasan por aquí:
 * arrancan recogidos cada vez. Al guardar se vuelve a leer lo guardado, así
 * varios cajones de la misma pantalla no se pisan.
 *   const [abierto, alternar] = usePlegadas("cuadre");
 *   <Plegable abierto={abierto("arqueo")} onAbiertoChange={alternar("arqueo")} …>
 */
export function usePlegadas(pantalla: string) {
  const clave = `corr-plegadas:${pantalla}`;
  const [plegadas, setPlegadas] = React.useState<Record<string, boolean>>({});
  // Lo guardado solo existe en el navegador: se lee después de montar.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lo guardado solo existe en el navegador
    setPlegadas(leerPlegadas(clave));
  }, [clave]);
  const abierto = (id: string) => !plegadas[id];
  const alternar = (id: string) => (a: boolean) => {
    const n = { ...leerPlegadas(clave), [id]: !a };
    try {
      localStorage.setItem(clave, JSON.stringify(n));
    } catch {
      /* se olvida al recargar */
    }
    setPlegadas(n);
  };
  return [abierto, alternar] as const;
}

/**
 * Un cajón de pantalla, listo para usar (Biela, CLAUDE.md «Cajones que se
 * recogen»): la tarjeta con su botón para recoger. Lo recogido se recuerda por
 * pantalla en este equipo; con `historial`, arranca recogido cada vez y no se
 * recuerda.
 *   <Cajon pantalla="movimientos" id="lista" titulo="Del día" contador={n} cifra={total}>…</Cajon>
 */
export function Cajon({
  pantalla,
  id,
  historial = false,
  ...props
}: Omit<React.ComponentProps<typeof Plegable>, "abierto" | "onAbiertoChange" | "defaultAbierto" | "variante"> & {
  pantalla: string;
  id: string;
  historial?: boolean;
}) {
  const [abierto, alternar] = usePlegadas(pantalla);
  const [verHistorial, setVerHistorial] = React.useState(false);
  return historial ? (
    <Plegable {...props} abierto={verHistorial} onAbiertoChange={setVerHistorial} />
  ) : (
    <Plegable {...props} abierto={abierto(id)} onAbiertoChange={alternar(id)} />
  );
}
