import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/pwa-register";
import { Entrada } from "@/components/fx/entrada";
import { COLOR_BARRA_SISTEMA } from "@/lib/colores-tema";

export const metadata: Metadata = {
  title: "Barrio Centro Sabanalarga 18 · Multidiagnósticos AS",
  description: "Cuadre diario, cupo de Luis y préstamos del punto corresponsal Bancolombia.",
  robots: { index: false, follow: false },
  applicationName: "Sabanalarga 18",
  appleWebApp: {
    capable: true,
    title: "Sabanalarga 18",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Al cargar, el del teléfono; ya hidratada, lib/tema.ts lo pone al del tema elegido.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COLOR_BARRA_SISTEMA.light },
    { media: "(prefers-color-scheme: dark)", color: COLOR_BARRA_SISTEMA.dark },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-[100dvh] antialiased">
        <Providers>
        <Entrada />
        {children}
        <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
