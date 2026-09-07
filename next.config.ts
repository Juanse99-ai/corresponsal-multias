import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Sello del despliegue, congelado dentro del bundle del navegador. Se compara
    // contra /api/version (que lo lee en caliente) para avisar que hay versión
    // nueva: la app queda instalada en el celular y se quedaba pegada en la vieja.
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? `dev-${Date.now()}`,
  },
};

export default nextConfig;
