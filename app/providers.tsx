"use client";

import { ThemeProvider } from "next-themes";

/** Proveedor de tema (claro/oscuro) basado en clase en <html>. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
