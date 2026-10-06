"use client";

import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { TopHeader } from "@/components/shell/top-header";
import { BarraAbajo } from "@/components/shell/barra-abajo";
import { RielPanel } from "@/components/shell/riel-panel";
import { seccionDe } from "@/components/shell/nav-items";
import { NuevaVersion } from "@/components/shell/nueva-version";
import { JalarParaActualizar } from "@/components/shell/jalar-para-actualizar";
import { VolverDesdeBorde } from "@/components/shell/volver-desde-borde";
import { BienvenidaSplash } from "@/components/fx/bienvenida-splash";
import { TRANSICION } from "@/lib/movimiento";
import { useAtrasCierraVentanas } from "@/lib/use-atras-cierra-ventanas";

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
  const isAdmin = profile.rol === "admin";
  // Atrás cierra la ventana u hoja de arriba antes de salirse de la pantalla.
  useAtrasCierraVentanas();
  // Miga de pan sobre el título ("Principal › Cuadre diario"), en el computador.
  const seccion = seccionDe(pathname);
  const miga = seccion
    ? ({ "--miga": JSON.stringify(`${seccion.grupo} › ${seccion.label}`) } as React.CSSProperties)
    : undefined;

  return (
    <MotionConfig reducedMotion="user" transition={TRANSICION}>
      {/* Computador: la app es una ventana redonda (el marco) sobre el lienzo,
          con el riel y el panel a la izquierda. Celular: el logo arriba y la
          barra de abajo. */}
      <div className="marco min-h-[100dvh]">
        <BienvenidaSplash nombre={profile.nombre} />

        <RielPanel profile={profile} isAdmin={isAdmin} pathname={pathname} resumen={resumen} />

        <div className="min-w-0 flex-1">
        <TopHeader resumen={resumen} isAdmin={isAdmin} />

        <div className="contenido-app mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-2 lg:pt-2 lg:pb-3" style={miga}>
          {children}
        </div>
        </div>

        {/* Celular: la barra de abajo reemplaza al menú de pantalla completa. */}
        <BarraAbajo profile={profile} isAdmin={isAdmin} pathname={pathname} resumen={resumen} />

        <NuevaVersion />
        <JalarParaActualizar />
        <VolverDesdeBorde />
      </div>
    </MotionConfig>
  );
}
