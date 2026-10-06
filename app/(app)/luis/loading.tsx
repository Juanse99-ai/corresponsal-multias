import { Skeleton, SkeletonPage, SkeletonCifras } from "@/components/ui/skeleton";

/** Carga de la cuenta del Sr. Luis: cabecera con el saldo acumulado, el día
 *  en celdas y las dos tarjetas (cupo y consignaciones). */
export default function Loading() {
  return (
    <SkeletonPage>
      <div className="mb-[18px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[26px] w-[220px] max-w-full" />
          <Skeleton className="h-[13px] w-[150px]" />
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-[26px] w-36" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-11 w-52 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <SkeletonCifras n={4} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
              <Skeleton className="h-[17px] w-32" />
              <Skeleton className="mt-2 h-3 w-48 max-w-full" />
              <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
              <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-11 w-36 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
