import { cn } from "@/lib/utils";

/** Fantasma de carga (transitions.dev, receta 14): bloque gris que pulsa. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("t-skel-pulse rounded-lg bg-surface-2", className)} />;
}

/** Encabezado fantasma con el mismo alto que PageHeader (título + subtítulo). */
export function SkeletonHeader() {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <Skeleton className="h-8 w-full max-w-56" />
      <Skeleton className="h-4 w-full max-w-72" />
    </div>
  );
}

/** Tarjeta fantasma genérica: título + dos líneas. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[1.25rem] border border-line bg-surface p-5 sm:p-6", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  );
}

/** Lista fantasma: filas con círculo + dos líneas, como los listados de la app. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-[1.25rem] border border-line bg-surface p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            {/* Anchos fluidos con tope (no fijos): un w-48 fijo infla el ancho
                mínimo de la tarjeta dentro de un grid y desborda en celular. */}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full max-w-32" />
              <Skeleton className="mt-1.5 h-3 w-full max-w-48" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
