import { Skeleton, SkeletonPage, SkeletonHeader, SkeletonCard, SkeletonCifras } from "@/components/ui/skeleton";

/** Carga del Panel: saludo, el cuadre de hoy en navy, el Sr. Luis en celdas,
 *  préstamos, la torta y la gráfica de los últimos cierres. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
          <div className="rounded-3xl bg-navy p-[22px] shadow-[var(--navy-filo)]">
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="mt-4 h-8 w-28 bg-white/10" />
            <Skeleton className="mt-3 h-3.5 w-56 max-w-full bg-white/10" />
            <Skeleton className="mt-6 h-11 w-full rounded-full bg-white/10" />
          </div>
          <SkeletonCard>
            <SkeletonCifras n={2} className="mt-10" />
          </SkeletonCard>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <SkeletonCard className="lg:order-last">
            <Skeleton className="mt-4 h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-36" />
            <Skeleton className="mt-4 h-10 w-full rounded-xl" />
            <Skeleton className="mt-1.5 h-10 w-full rounded-xl" />
          </SkeletonCard>
          <SkeletonCard>
            <div className="mt-4 flex items-center gap-5">
              <Skeleton className="size-32 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            </div>
          </SkeletonCard>
        </div>
        <SkeletonCard>
          <div className="mt-4 flex h-36 items-end gap-1 lg:h-44">
            {[62, 70, 55, 80, 66, 74, 58, 69, 77, 61, 72, 85, 64, 90].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
