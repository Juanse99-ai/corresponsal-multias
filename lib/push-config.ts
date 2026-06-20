// Clave pública VAPID (segura de exponer; la privada vive solo en Supabase).
// Fallback embebido para que el cliente funcione aunque no haya variable de entorno.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BACtXGzXs9o-fBv7yeed5rVL4aBHkRBA0qTBiNjcU3TrhgVB2YcF6v2WELecswCoK2D6jmjiuQtBgl861swLvMY";
