import { requireSession } from "@/lib/auth";
import { getHeaderResumen } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
// Importar todas las pantallas aquí hace que la lista de componentes de
// cliente de cada ruta incluya los de todas: las pestañas del computador pintan
// cualquier pantalla desde cualquier ruta (ver paginas.ts).
import "./paginas";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();
  const resumen = await getHeaderResumen(hoyISO());
  return (
    <AppShell
      profile={{ nombre: profile.nombre, rol: profile.rol, email: profile.email }}
      resumen={resumen}
    >
      {children}
    </AppShell>
  );
}
