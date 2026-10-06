import { Skeleton, SkeletonPage, SkeletonHeader } from "@/components/ui/skeleton";

/** Carga del Cuadre: cabecera con las flechas de día, la tarjeta de captura
 *  (campo grande, fila del Sr. Luis y la rejilla de campos) y el resultado en navy. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader>
        <Skeleton className="ml-auto h-11 w-40 rounded-full" />
      </SkeletonHeader>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-[17px] w-44" />
            <Skeleton className="size-[38px] rounded-full" />
          </div>
          <Skeleton className="mt-6 h-3 w-24" />
          <Skeleton className="mt-2 h-14 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-[58px] w-full rounded-xl" />
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-11 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-navy p-[22px] shadow-[var(--navy-filo)]">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="mt-4 h-8 w-28 bg-white/10" />
          <Skeleton className="mt-3 h-3.5 w-52 max-w-full bg-white/10" />
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full bg-white/10" />
            ))}
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-full bg-white/10" />
          <Skeleton className="mt-2.5 h-11 w-full rounded-full bg-white/10" />
        </div>
      </div>
    </SkeletonPage>
  );
}
