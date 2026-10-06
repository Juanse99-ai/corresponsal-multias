import { cn } from "@/lib/utils"

/** Bloque de carga: gris de apoyo con un brillo que lo cruza (globals.css). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("brillo relative overflow-hidden rounded-lg bg-bg-soft", className)}
      {...props}
    />
  )
}

// ===== Formas de carga de la app (loading.tsx) ===============================
// Mientras llegan los datos la pantalla conserva su forma (título, cifras,
// filas), así al llegar no se mueve nada. El esqueleto no entra por bloques.

/** Envoltorio de una pantalla que carga: se anuncia al lector de pantalla. */
function SkeletonPage({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="contents">{children}</div>
    </div>
  )
}

/** Título de 26 y subtítulo de 13, como la cabecera de la pantalla. */
function SkeletonHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("mb-[18px] flex flex-wrap items-end gap-x-6 gap-y-3", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-[26px] w-[190px] max-w-full" />
        <Skeleton className="h-[13px] w-[120px]" />
      </div>
      {children}
    </div>
  )
}

/** Tarjeta de 24 con título y unas líneas. */
function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]", className)}>
      <Skeleton className="h-[17px] w-40" />
      {children ?? (
        <>
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
        </>
      )}
    </div>
  )
}

/** Lista dentro de una tarjeta: filas de 44 con círculo, texto y cifra. */
function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-[var(--tarjeta-borde)] bg-card p-5 shadow-[var(--tarjeta-sombra)]", className)}>
      <Skeleton className="h-[17px] w-32" />
      <div className="mt-4 flex flex-col gap-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            {/* Anchos fluidos con tope: uno fijo infla el ancho mínimo de la
                tarjeta dentro de un grid y desborda en el celular. */}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-full max-w-32" />
              <Skeleton className="mt-1.5 h-2.5 w-full max-w-48" />
            </div>
            <Skeleton className="h-3.5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Cifras en celdas: rótulo y cifra, partidas por filetes. */
function SkeletonCifras({ n = 3, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("grid auto-cols-fr grid-flow-col overflow-hidden rounded-2xl border border-line", className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 border-line px-3 py-2.5 not-first:border-l">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24 max-w-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonPage, SkeletonHeader, SkeletonCard, SkeletonList, SkeletonCifras }
