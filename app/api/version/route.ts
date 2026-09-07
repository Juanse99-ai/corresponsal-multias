import { NextResponse } from "next/server";

// Sello del despliegue que está sirviendo AHORA. El navegador lo compara con el
// que trae su bundle para saber si se quedó con una versión vieja en caché.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
