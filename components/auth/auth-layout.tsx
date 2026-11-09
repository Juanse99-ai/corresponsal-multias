import { Logo } from "@/components/brand";
import { HoyPastilla, Fecha } from "@/components/auth/hoy";

/**
 * Marco de las pantallas de acceso (entrar, recuperar clave, clave nueva), con
 * el ingreso de Biela (8 nov 2026, referencia de Mobbin que trajo el dueño):
 * papel claro, la marca arriba a la izquierda, una pastilla con la fecha y la
 * hora arriba al centro, el título grande en dos renglones (tinta y gris), los
 * campos en pastilla y el botón a lo ancho. A la derecha, en vez de la foto
 * del taller, el panel redondo con la marca en el azul marino del login. En
 * tablet y celular el panel va arriba como una franja y la fecha sobre el
 * título.
 */
export function AuthLayout({
  titulo,
  titulo2,
  detalle,
  pie,
  children,
}: {
  titulo: React.ReactNode;
  /** Segundo renglón del título, en gris. */
  titulo2?: string;
  detalle?: string;
  pie?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // group/login: con un campo enfocado en el celular (teclado abierto), la
    // franja se recoge y el botón queda a la vista encima del teclado.
    <main className="group/login relative grid min-h-[100dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] bg-blanco p-4 text-text lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-none lg:gap-6 lg:p-6">
      <HoyPastilla />

      {/* La marca en su panel redondo (en el celular, una franja arriba). */}
      <section
        aria-hidden
        className="relative order-first grid h-[clamp(150px,26vh,240px)] place-items-center overflow-hidden rounded-3xl bg-nav-bg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] group-has-[input:focus]/login:hidden lg:order-last lg:mt-[68px] lg:h-auto lg:min-h-60 lg:group-has-[input:focus]/login:grid"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size={88} className="rounded-[1.4rem] lg:size-24" />
          <div className="hidden leading-tight lg:block">
            <p className="text-title font-medium tracking-[-0.2px] text-nav-text">Barrio Centro Sabanalarga 18</p>
            <p className="mt-1 text-body text-nav-muted">Punto corresponsal Bancolombia</p>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-7 px-1 pt-5 pb-2 sm:items-center lg:items-stretch lg:gap-8 lg:px-10 lg:py-3">
        <div className="flex min-h-11 w-full min-w-0 items-center gap-3 sm:max-w-[440px] lg:max-w-none">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white p-[3px] shadow-[0_0_0_1px_var(--line)]">
            <Logo size={38} className="rounded-lg" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-title leading-tight font-medium tracking-[-0.2px]">Multidiagnósticos AS</span>
            <span className="mt-[3px] block text-meta leading-none text-muted">Corresponsal Bancolombia</span>
          </span>
        </div>

        <div className="w-full sm:max-w-[440px] lg:my-auto">
          <Fecha className="mb-2.5 block text-meta leading-none font-medium text-muted lg:hidden" />
          <h1 className="mb-6 text-h1 leading-[1.15] font-medium tracking-[-0.4px] text-balance lg:mb-8 lg:text-display lg:tracking-[-0.8px]">
            {titulo}
            {titulo2 && <span className="block text-faint">{titulo2}</span>}
          </h1>
          {detalle && <p className="-mt-3 mb-6 text-body text-text-2 lg:-mt-5">{detalle}</p>}

          {children}

          {pie && <p className="mt-5 max-w-[44ch] text-body leading-snug text-muted">{pie}</p>}
        </div>
      </section>
    </main>
  );
}
