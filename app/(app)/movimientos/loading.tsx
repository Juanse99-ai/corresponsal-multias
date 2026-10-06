import { Skeleton, SkeletonPage, SkeletonHeader, SkeletonList, SkeletonCifras } from "@/components/ui/skeleton";

/** Carga de Movimientos: cabecera con las flechas de día, la tarjeta de
 *  registro con sus cuatro baldosas, la lista y los totales en celdas. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader>
        <Skeleton className="ml-auto h-11 w-40 rounded-full" />
      </SkeletonHeader>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
            <Skeleton className="h-[17px] w-48" />
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[62px] rounded-2xl" />
              ))}
            </div>
            <Skeleton className="mt-4 h-3 w-16" />
            <Skeleton className="mt-2 h-14 w-full rounded-2xl" />
            <Skeleton className="mt-5 h-11 w-52 max-w-full rounded-full" />
          </div>
          <SkeletonList rows={4} />
        </div>
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <Skeleton className="h-[17px] w-36" />
          <SkeletonCifras n={2} className="mt-4" />
          <SkeletonCifras n={2} className="-mt-px" />
          <Skeleton className="mt-4 h-11 w-full rounded-full" />
        </div>
      </div>
    </SkeletonPage>
  );
}
