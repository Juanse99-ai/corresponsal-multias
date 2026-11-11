import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getHeaderResumen } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
import { tieneClaveCaja, tieneCookieEquipo } from "@/lib/caja-servidor";
// Importar todas las pantallas aquí hace que la lista de componentes de
// cliente de cada ruta incluya los de todas: las pestañas del computador pintan
// cualquier pantalla desde cualquier ruta (ver paginas.ts).
import "./paginas";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();
  const [resumen, equipo, conClave] = await Promise.all([
    getHeaderResumen(hoyISO()),
    tieneCookieEquipo(),
    profile.rol === "admin" ? Promise.resolve(true) : tieneClaveCaja(profile.id),
  ]);
  // Quien no es administrador entra con su clave de caja: si aún no la tiene
  // (primera vez, entró con correo), la crea antes de seguir.
  if (conClave === false) redirect("/crear-clave");
  return (
    <AppShell
      profile={{ nombre: profile.nombre, rol: profile.rol, email: profile.email }}
      resumen={resumen}
      equipo={equipo}
    >
      {children}
    </AppShell>
  );
}
