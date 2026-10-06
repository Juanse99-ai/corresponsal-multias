import { Skeleton, SkeletonPage, SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

const tarjeta = "rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]";

/** Carga de Control general: el balance con sus siete campos y el saldo total
 *  en navy, los soportes, compensaciones/retiros y el historial. */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className={tarjeta}>
            <Skeleton className="h-[17px] w-36" />
            <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-1.5 h-11 w-full rounded-2xl" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-3.5 h-3 w-24" />
            <Skeleton className="mt-1.5 h-[72px] w-full rounded-2xl" />
          </div>
          <div className="rounded-3xl bg-navy p-[22px] shadow-[var(--navy-filo)]">
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="mt-3 h-8 w-40 bg-white/10" />
            <Skeleton className="mt-6 h-11 w-full rounded-full bg-white/10" />
          </div>
        </div>
        <div className={tarjeta}>
          <Skeleton className="h-[17px] w-36" />
          <Skeleton className="mt-4 h-36 w-full rounded-2xl" />
        </div>
        <div className={tarjeta}>
          <Skeleton className="h-[17px] w-56 max-w-full" />
          <Skeleton className="mt-4 h-10 w-64 max-w-full rounded-full" />
          <div className="mt-4 grid gap-x-4 gap-y-3.5 sm:grid-cols-[1fr_150px]">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-[38px] w-56 max-w-full rounded-full" />
          <Skeleton className="mt-4 h-11 w-52 max-w-full rounded-full" />
        </div>
        <SkeletonList rows={5} />
      </div>
    </SkeletonPage>
  );
}
