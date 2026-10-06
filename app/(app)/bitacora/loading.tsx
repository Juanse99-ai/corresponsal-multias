import { Skeleton, SkeletonPage, SkeletonHeader, SkeletonCifras } from "@/components/ui/skeleton";

/** Carga de la Bitácora: el resumen en celdas, la barra de filtros y la línea
 *  de tiempo del día. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <SkeletonCifras n={4} />
        </div>
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 min-w-[12rem] flex-1 rounded-full" />
            <Skeleton className="h-9 w-[8.75rem] rounded-full" />
            <Skeleton className="h-9 w-[8.75rem] rounded-full" />
            <Skeleton className="size-[38px] rounded-full" />
          </div>
          <Skeleton className="mt-3 h-10 w-80 max-w-full rounded-full" />
          <Skeleton className="mt-5 h-3 w-16" />
          <div className="mt-3 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[52px_32px_minmax(0,1fr)] items-center gap-x-3">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="size-8 rounded-full" />
                <div>
                  <Skeleton className="h-3.5 w-full max-w-72" />
                  <Skeleton className="mt-1.5 h-3 w-full max-w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
