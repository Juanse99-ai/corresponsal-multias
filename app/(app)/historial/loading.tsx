import { Skeleton, SkeletonPage, SkeletonHeader, SkeletonCifras } from "@/components/ui/skeleton";

/** Carga del Historial: el segmentado, la gráfica de tendencia y la lista
 *  con su barra de filtros y las cifras del rango. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <Skeleton className="h-11 w-52 rounded-full lg:h-10" />
      <div className="mt-5 flex flex-col gap-5">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <Skeleton className="h-[17px] w-44" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full" />
          <Skeleton className="mt-5 h-56 w-full rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[8.75rem] rounded-full" />
            <Skeleton className="h-9 w-[8.75rem] rounded-full" />
            <Skeleton className="ml-auto size-[38px] rounded-full" />
          </div>
          <SkeletonCifras n={3} className="mt-4" />
          <div className="mt-4 flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
