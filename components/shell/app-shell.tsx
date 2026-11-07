"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { TopHeader } from "@/components/shell/top-header";
import { NavOverlay } from "@/components/shell/nav-overlay";
import { TabsSuperior, TabsInferior } from "@/components/shell/tab-bar";
import { NuevaVersion } from "@/components/shell/nueva-version";
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

        <div className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl">
          <TopHeader resumen={resumen} isAdmin={isAdmin} onOpenMenu={() => setMenuOpen(true)} />
          <TabsSuperior pathname={pathname} />
        </div>

        <NavOverlay
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          profile={profile}
          isAdmin={isAdmin}
          pathname={pathname}
          resumen={resumen}
        />

        <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-6 md:pb-16 sm:px-6 lg:px-8 lg:pt-7">
          {children}
        </div>

        <TabsInferior pathname={pathname} />
        <NuevaVersion />
      </div>
    </MotionConfig>
  );
}
