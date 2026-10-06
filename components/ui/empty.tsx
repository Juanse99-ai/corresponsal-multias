import { cn } from "@/lib/utils"

/**
 * Vacío del taller: una etiqueta seca, gris, sin negrita, sin ícono, sin
 * borde punteado y sin punto final ("Sin movimientos"). Pista opcional debajo
 * solo si dice algo útil. `compacto` para paneles y menús; `fila` a la
 * izquierda y sin relleno grande, dentro de una sección; `error` cuando lo que
 * falta es por un fallo (en rojo y anunciado).
 */
function Empty({
  className,
  compacto = false,
  fila = false,
  error = false,
  ...props
}: React.ComponentProps<"div"> & { compacto?: boolean; fila?: boolean; error?: boolean }) {
  return (
    <div
      data-slot="empty"
      data-error={error || undefined}
      data-fila={fila || undefined}
      role={error ? "alert" : undefined}
      className={cn(
        "group/empty flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-5 py-10 text-center text-balance",
        compacto && "px-4 py-5",
        fila && "flex-none items-start px-0 py-2.5 text-left",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-1.5 group-data-[fila=true]/empty:items-start",
        className
      )}
      {...props}
    />
  )
}

/** Los vacíos del taller no llevan ícono: se deja por compatibilidad y no se pinta. */
function EmptyMedia({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "icon" }) {
  return <div data-slot="empty-icon" data-variant={variant} aria-hidden className={cn("hidden", className)} {...props} />
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "text-body leading-[1.45] font-normal text-muted group-data-[error=true]/empty:font-semibold group-data-[error=true]/empty:text-bad-fg",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "max-w-[40ch] text-meta leading-[1.45] text-faint [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-accent",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "mt-2.5 flex w-full max-w-sm min-w-0 flex-col items-center gap-2 text-body text-balance",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
