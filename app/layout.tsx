import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/pwa-register";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f29" },
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
        <div className="ambient" aria-hidden />
        <div className="grain" aria-hidden />
        {children}
        <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
