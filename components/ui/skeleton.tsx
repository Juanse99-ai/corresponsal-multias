import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  )
}

// ===== Bloques de carga de la app (loading.tsx), hechos con <Skeleton> =====

function SkeletonHeader() {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <Skeleton className="h-8 w-full max-w-56" />
      <Skeleton className="h-4 w-full max-w-72" />
    </div>
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[1.25rem] border bg-card p-5 sm:p-6", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  )
}

function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-[1.25rem] border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            {/* Anchos fluidos con tope: uno fijo infla el ancho mínimo de la
                tarjeta dentro de un grid y desborda en el celular. */}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full max-w-32" />
              <Skeleton className="mt-1.5 h-3 w-full max-w-48" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, SkeletonHeader, SkeletonCard, SkeletonList }
