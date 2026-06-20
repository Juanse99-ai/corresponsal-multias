"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { TopHeader } from "@/components/shell/top-header";
import { NavOverlay } from "@/components/shell/nav-overlay";
import { BienvenidaSplash } from "@/components/fx/bienvenida-splash";

export function AppShell({
  profile,
  resumen,
  children,
}: {
  profile: { nombre: string; rol: Rol; email: string };
  resumen: HeaderResumen;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = profile.rol === "admin";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh]">
        <BienvenidaSplash nombre={profile.nombre} />

        <TopHeader resumen={resumen} isAdmin={isAdmin} onOpenMenu={() => setMenuOpen(true)} />

        <NavOverlay
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          profile={profile}
          isAdmin={isAdmin}
          pathname={pathname}
          resumen={resumen}
        />

        <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          {children}
        </div>
      </div>
    </MotionConfig>
  );
}
