import type { NextConfig } from "next";
import { SUPABASE_URL } from "./lib/supabase/config";

const esDev = process.env.NODE_ENV === "development";

// Reglas de lo que el navegador puede cargar. Todo sale de este dominio salvo
// Supabase (datos y fotos de soportes). Los 'unsafe-inline' son por Next, que
// mete su propio script y sus estilos en la página; pasar a nonce obliga a
// tocar el proxy de sesión, así que por ahora se queda así: aun con eso, un
// script de otro dominio no carga y la página no se puede meter en un iframe.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${SUPABASE_URL}`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} ${SUPABASE_URL.replace("https://", "wss://")}`,
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  env: {
    // Sello del despliegue, congelado dentro del bundle del navegador. Se compara
    // contra /api/version (que lo lee en caliente) para avisar que hay versión
    // nueva: la app queda instalada en el celular y se quedaba pegada en la vieja.
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? `dev-${Date.now()}`,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Nadie puede embeber la app para engañar al operador con clics.
          { key: "X-Frame-Options", value: "DENY" },
          // El navegador respeta el tipo de archivo que declara el servidor.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Al salir a otro sitio no se filtra la ruta interna que se estaba viendo.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
