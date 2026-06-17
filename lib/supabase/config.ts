// Llaves publicas de Supabase (publishable + URL). Son seguras de exponer:
// el acceso real lo controla RLS, no el secreto de la llave. Se usan como
// respaldo para que el build en Vercel funcione aunque no haya variables de entorno.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hpndvrjjizzkusuuhefb.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_VtozFCxJn5RJ7c-GVGzeRA_9LVd3HQx";
