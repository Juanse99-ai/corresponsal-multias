import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();
  return (
    <AppShell profile={{ nombre: profile.nombre, rol: profile.rol, email: profile.email }}>
      {children}
    </AppShell>
  );
}
