import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Guarda la suscripción push del usuario autenticado. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const sub = await req.json().catch(() => null);
  const endpoint: string | undefined = sub?.endpoint;
  const p256dh: string | undefined = sub?.keys?.p256dh;
  const auth: string | undefined = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const { error } = await supabase
    .from("corr_push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth_key: auth },
      { onConflict: "endpoint", ignoreDuplicates: true },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Elimina la suscripción (al desactivar avisos). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    await supabase.from("corr_push_subscriptions").delete().eq("endpoint", endpoint);
  }
  return NextResponse.json({ ok: true });
}
