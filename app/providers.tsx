"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useColorBarraSistema } from "@/lib/tema";

/** Dentro del ThemeProvider: la barra del sistema toma el color del tema elegido. */
function ColorBarraSistema() {
  useColorBarraSistema();
  return null;
}

/** Proveedores globales: tema (clase en <html>), tooltips y avisos flotantes (sonner). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <ColorBarraSistema />
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster containerAriaLabel="Avisos" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
