import type { MetadataRoute } from "next";

/** Manifest de la PWA: hace la app instalable en el celular (ícono + standalone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barrio Centro Sabanalarga 18 · Multidiagnósticos AS",
    short_name: "Sabanalarga 18",
    description: "Cuadre diario, cupo de Luis y préstamos del punto corresponsal Bancolombia.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#f5f7fb",
    theme_color: "#f5f7fb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
