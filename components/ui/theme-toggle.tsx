"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react/dist/ssr";
import { Switch } from "@/components/ui/switch";
import { useMontado } from "@/lib/use-montado";

/**
 * Interruptor de tema: Azul (de día, sol) o Noche (negro, luna). <Switch> de
 * shadcn con sol y luna a los lados. `sobre="claro"` para usarlo fuera del
 * menú azul marino.
 */
export function ThemeToggle({ sobre = "menu" }: { sobre?: "menu" | "claro" }) {
  const icono = sobre === "menu" ? "size-5 text-nav-muted" : "size-5 text-muted";
  const { resolvedTheme, setTheme } = useTheme();
  // En el servidor no se sabe el tema: se pinta apagado hasta hidratar.
  const montado = useMontado();
  const oscuro = montado && resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-2.5">
      <Sun weight="fill" className={icono} aria-hidden />
      <Switch
        checked={oscuro}
        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
        aria-label="Tema Noche"
        className="scale-125"
      />
      <Moon weight="fill" className={icono} aria-hidden />
    </div>
  );
}
