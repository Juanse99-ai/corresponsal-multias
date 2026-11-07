"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TABS, isActive } from "@/components/shell/nav-items";

const deslizar = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * Pestañas fijas con las secciones del día a día, para no abrir el menú en
 * cada cambio. Desde tablet van bajo el encabezado; en celular, abajo al
 * alcance del pulgar, como en iOS. Lo de admin sigue en el menú.
 */
export function TabsSuperior({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Secciones" className="hidden px-3 sm:px-6 md:block lg:px-8">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const activa = isActive(pathname, t.href);
          const Icono = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-2 rounded-t-md px-3 text-[0.84rem] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
                  activa ? "text-text" : "text-muted hover:text-text",
                )}
              >
                <Icono size={16} weight={activa ? "fill" : "regular"} className={activa ? "text-accent" : undefined} />
                {t.corto ?? t.label}
                {activa && (
                  <motion.span
                    layoutId="tab-superior"
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent"
                    transition={deslizar}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TabsInferior({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t) => {
          const activa = isActive(pathname, t.href);
          const Icono = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[0.66rem] font-medium transition-colors active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/45",
                  activa ? "text-accent-strong" : "text-muted",
                )}
              >
                <span className="relative flex h-7 w-12 items-center justify-center">
                  {activa && (
                    <motion.span
                      layoutId="tab-inferior"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-accent-soft"
                      transition={deslizar}
                    />
                  )}
                  <Icono size={20} weight={activa ? "fill" : "regular"} className="relative" />
                </span>
                {t.corto ?? t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
