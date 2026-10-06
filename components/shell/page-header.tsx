import { cn } from "@/lib/utils";

/**
 * Cabecera de pantalla (guía 8.2): título de 26 (22 en el celular) con la miga
 * encima en el computador, subtítulo, y a la derecha las cifras de cabecera
 * y las acciones. En el celular las cifras bajan debajo del título.
 */
export function PageHeader({
  title,
  subtitle,
  cifras,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Cifras de cabecera (`CifraCabecera`), separadas por su divisor. */
  cifras?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-[18px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      {/* data-titulo: en el computador lleva encima la miga de pan (globals.css). */}
      <div data-titulo className="min-w-0">
        <h1 className="text-h1 font-medium tracking-[-0.6px] text-text lg:text-kpi">{title}</h1>
        {subtitle && <p className="mt-[5px] text-body text-muted">{subtitle}</p>}
      </div>
      {(cifras || children) && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {cifras && <div className="flex items-end gap-5 sm:gap-6">{cifras}</div>}
          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      )}
    </div>
  );
}

/** Cifra de cabecera: rótulo de 12,5 y cifra de 26, con un chip opcional debajo. */
export function CifraCabecera({
  rotulo,
  children,
  chip,
  divisor = false,
  className,
}: {
  rotulo: string;
  children: React.ReactNode;
  chip?: React.ReactNode;
  /** Línea de 1 × 44 a la izquierda, cuando va después de otra cifra. */
  divisor?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-5 sm:gap-6", className)}>
      {divisor && <span aria-hidden className="h-11 w-px self-center bg-line-strong" />}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-meta font-medium text-faint">{rotulo}</span>
        <span className="tnum text-kpi leading-none font-semibold tracking-[-0.6px] text-text">{children}</span>
        {chip && <span className="mt-1 flex">{chip}</span>}
      </div>
    </div>
  );
}
