import { cn } from "@/lib/utils";

/** Marca: cuadro azul con un pulso (diagnóstico) blanco y pico rojo, como el logo. */
export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="lg_blue" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.56 0.17 258)" />
          <stop offset="1" stopColor="oklch(0.42 0.16 262)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#lg_blue)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" stroke="oklch(1 0 0 / 0.18)" strokeWidth="1" />
      {/* pulso */}
      <path
        d="M7 25 H17 L20 25 L23.5 14 L27 34 L30 20 L32 25 H41"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* pico rojo */}
      <path
        d="M20 25 L23.5 14 L27 34 L30 20"
        stroke="oklch(0.62 0.21 25)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={32} />
      <div className="leading-none">
        <p className="text-sm font-semibold tracking-tight text-text">Corresponsal</p>
        <p className="text-[0.7rem] text-faint">Multidiagnósticos AS</p>
      </div>
    </div>
  );
}
