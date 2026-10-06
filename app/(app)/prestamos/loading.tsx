import { Skeleton, SkeletonPage } from "@/components/ui/skeleton";

/** Carga de Préstamos: cabecera con el total pendiente, la lista de personas
 *  (renglones que se abren) y el formulario de un préstamo nuevo. */
export default function Loading() {
  return (
    <SkeletonPage>
      <div className="mb-[18px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[26px] w-[150px]" />
          <Skeleton className="h-[13px] w-[210px] max-w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-[26px] w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <Skeleton className="h-[17px] w-32" />
          <div className="mt-4 flex flex-col gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex h-16 items-center gap-3">
                <Skeleton className="size-3.5 shrink-0 rounded" />
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-full max-w-36" />
                  <Skeleton className="mt-1.5 h-3 w-full max-w-52" />
                </div>
                <Skeleton className="h-4 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <Skeleton className="h-[17px] w-36" />
          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[62px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mt-5 h-11 w-full rounded-full" />
        </div>
      </div>
    </SkeletonPage>
  );
}
