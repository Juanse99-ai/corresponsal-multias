"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react/dist/ssr";
import { Switch } from "@/components/ui/switch";
import { useMontado } from "@/lib/use-montado";

/** Interruptor claro/oscuro: <Switch> de shadcn con sol y luna a los lados. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // En el servidor no se sabe el tema: se pinta apagado hasta hidratar.
  const montado = useMontado();
  const oscuro = montado && resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-2.5">
      <Sun weight="fill" className="size-5 text-nav-muted" aria-hidden />
      <Switch
        checked={oscuro}
        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
        aria-label="Modo oscuro"
        className="scale-125"
      />
      <Moon weight="fill" className="size-5 text-nav-muted" aria-hidden />
    </div>
  );
}
