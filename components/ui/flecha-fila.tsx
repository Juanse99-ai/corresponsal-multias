import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * Fin de fila (Biela, 22 oct 2026): la fila que abre su detalle termina en una
 * sola forma, la flecha › de 16 px en tinta inerte. Solo avisa: el botón es la
 * fila entera. Si la fila trae acciones, el ⋯ va antes y la flecha cierra.
 * test/diseno-pantallas.test.ts falla si una pantalla dibuja su flecha a mano.
 */
export function FlechaFila({ className }: { className?: string }) {
  return <CaretRight aria-hidden size={16} weight="bold" className={cn("shrink-0 text-inerte", className)} />;
}
