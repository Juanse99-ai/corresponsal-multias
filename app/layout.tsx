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
        {/* Filtro de refracción para los botones Liquid Glass (#container-glass). */}
        <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
          <defs>
            <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
              <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
              <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="60" xChannelSelector="R" yChannelSelector="B" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="3" result="finalBlur" />
              <feComposite in="finalBlur" in2="finalBlur" operator="over" />
            </filter>
          </defs>
        </svg>
        {children}
        <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
