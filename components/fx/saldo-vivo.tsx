"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { AnimatedMoney } from "@/components/ui/animated-number";

/** Saldo final del cuadre: la cifra se desliza al nuevo valor al escribir y el ícono
 *  cambia entre check (cuadrado) y raya (descuadre). */
export function SaldoVivo({ saldo, descuadre }: { saldo: number; descuadre: boolean }) {
  const reducir = useReducedMotion();
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 transition-colors duration-500",
        descuadre ? "text-danger" : "text-success",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-500 sm:h-14 sm:w-14",
          descuadre ? "bg-danger-soft" : "bg-success-soft",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={descuadre ? "descuadre" : "cuadrado"}
            className="flex"
            initial={reducir ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reducir ? undefined : { scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {descuadre ? <Minus size={24} weight="bold" /> : <Check size={24} weight="bold" />}
          </motion.span>
        </AnimatePresence>
      </span>
      <AnimatedMoney
        value={saldo}
        className="tnum min-w-0 flex-1 text-[1.75rem] leading-none font-semibold tracking-tight sm:text-4xl"
      />
    </div>
  );
}
