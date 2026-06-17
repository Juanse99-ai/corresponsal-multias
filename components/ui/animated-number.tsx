"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { formatCOP, formatMiles } from "@/lib/format";

/** Numero de pesos que se interpola suavemente cuando cambia el valor. */
export function AnimatedMoney({
  value,
  className,
  withSign = true,
}: {
  value: number;
  className?: string;
  withSign?: boolean;
}) {
  const spring = useSpring(value, { stiffness: 150, damping: 26, mass: 0.6 });
  const text = useTransform(spring, (v) =>
    withSign ? formatCOP(Math.round(v)) : formatMiles(Math.round(v)),
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{text}</motion.span>;
}
