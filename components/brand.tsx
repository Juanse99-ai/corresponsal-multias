import { cn } from "@/lib/utils";

/** Marca: el logo real de Multidiagnósticos AS en un recuadro. */
export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[0.65rem] bg-black ring-1 ring-white/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-multias.jpg" alt="Multidiagnósticos AS" className="h-full w-full object-contain" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={32} />
      <div className="leading-none">
        <p className="text-sm font-semibold tracking-tight text-text">Barrio Centro Sabanalarga 18</p>
        <p className="text-[0.7rem] text-faint">Multidiagnósticos AS</p>
      </div>
    </div>
  );
}
