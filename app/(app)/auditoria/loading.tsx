import { Skeleton, SkeletonPage, SkeletonHeader } from "@/components/ui/skeleton";

/** Carga de Auditoría: los hallazgos en filas con su círculo y el cruce con
 *  el grupo (cabecera con filtros, hilo y la barra de escribir). */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]">
          <Skeleton className="h-3 w-20" />
          <div className="mt-3 flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex min-h-14 items-start gap-3 py-1.5">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-full max-w-52" />
                  <Skeleton className="mt-2 h-3 w-full max-w-80" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0 self-center" />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[var(--tarjeta-borde)] bg-card shadow-[var(--tarjeta-sombra)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
            <Skeleton className="h-[17px] w-40" />
            <Skeleton className="h-9 w-[8.75rem] rounded-full" />
          </div>
          <div className="min-h-[14rem] bg-bg-soft" />
          <div className="flex items-center gap-2 p-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="h-11 min-w-0 flex-1 rounded-full" />
            <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
