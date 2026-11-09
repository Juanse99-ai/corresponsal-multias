import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Spinner } from "@/components/ui/spinner"

// Botón de Biela: pastilla de 44 (38 la pequeña), 15/500, ícono de 17. Al
// tocar cede a 0,96 y, apagado, se pinta en gris legible, nunca con opacidad:
// el rótulo dice qué falta. Un contorno apagado sigue siendo contorno.
// Texto de una o dos palabras como mucho (test/botones-cortos.test.ts).
// Procesando (`cargando`, Biela 11 oct 2026): conserva su color, gira una
// ruedita antes del rótulo y no deja tocarlo otra vez; no es `disabled`, que
// quedaba igual al apagado y no se sabía si trabajaba o se había colgado.
const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent text-title font-medium whitespace-nowrap outline-none select-none transition-[color,background-color,border-color,box-shadow,transform,filter] duration-[var(--dur-1)] ease-ios active:scale-[var(--presion)] active:brightness-95 aria-busy:pointer-events-none aria-busy:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-fill disabled:text-text-2 disabled:shadow-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[17px]",
  {
    variants: {
      variant: {
        // La acción principal: una sola pastilla azul a la vista.
        default: "bg-primary text-primary-foreground shadow-primario hover:bg-accent-strong dark:hover:bg-primary/90 dark:border-white/20",
        // Solo para destruir, dentro de la confirmación.
        destructive: "bg-danger-fill text-accent-ink hover:bg-danger-fill/90 dark:border-white/20",
        // Acción secundaria de la página.
        outline:
          "border-line bg-blanco text-text shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_10px_-6px_rgba(0,0,0,0.1)] hover:bg-bg-soft dark:border-borde-boton dark:bg-surface dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)] disabled:border-line disabled:bg-surface disabled:text-faint disabled:shadow-none",
        // Gris relleno: Cancelar y los secundarios del pie de una ventana.
        secondary: "bg-surface-2 text-text hover:bg-elevated",
        // Terciaria en línea ("Deshacer"). Nunca en el pie de una ventana.
        ghost: "text-text-2 hover:bg-surface-2 hover:text-text disabled:bg-transparent disabled:text-faint",
        link: "text-accent underline-offset-4 hover:underline disabled:bg-transparent disabled:text-faint",
        // Sobre la tarjeta navy: translúcido con letra blanca en los dos temas.
        "sobre-oscuro":
          "border-white/28 bg-white/12 text-white hover:bg-white/18 focus-visible:outline-white disabled:border-white/15 disabled:bg-white/8 disabled:text-white/60",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-[38px] gap-1.5 px-4 text-body [&_svg:not([class*='size-'])]:size-4",
        // Solo el botón de Entrar: 48 a lo ancho.
        lg: "h-12 px-6",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-sm": "size-[38px]",
        // Dibujado de 30 (en un campo o pegado a un título) con toque de 44.
        "icon-inline": "size-[30px] after:absolute after:-inset-[7px] after:rounded-full [&_svg:not([class*='size-'])]:size-[15px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  cargando = false,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Mientras corre la petición: ruedita, mismo color y sin segundo toque. */
    cargando?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // Por defecto "button": un botón sin type dentro de un <form> lo envía.
      // Los de enviar llevan type="submit" explícito.
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={cargando || undefined}
      aria-disabled={cargando || props["aria-disabled"] || undefined}
      onClick={cargando ? (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick}
      {...props}
    >
      {cargando && !asChild ? (
        <>
          <Spinner className="size-[15px]" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
