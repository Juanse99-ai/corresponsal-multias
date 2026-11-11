import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { SOPORTES_BUCKET } from "@/lib/queries";
import { leerComprobante, lecturaDisponible, type Comprobante } from "@/lib/leer-comprobante";
import { decidirComprobante } from "@/lib/comprobante-auto";
import { fechaDeTirilla } from "@/lib/fecha-tirilla";
import { avisarAdmins } from "@/lib/avisos";
import { formatCOP, hoyISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Entrada del agente: recibe la foto de un comprobante que el dueño mandó en el
 * grupo de WhatsApp del corresponsal (la reenvía el puente de OpenClaw, ver
 * openclaw/corresponsal-puente) y la convierte en consignación del Sr. Luis.
 *
 * Opción A (11 nov 2026): lo seguro se guarda solo; lo dudoso queda como foto
 * pendiente del día en "Llenar desde fotos" y avisa a los administradores.
 * La decisión está en lib/comprobante-auto.ts (probada en test/).
 *
 * Seguridad: sin sesión; se entra con `Authorization: Bearer <AGENTE_TOKEN>`
 * (variable de Vercel). Sin AGENTE_TOKEN o sin SUPABASE_SERVICE_ROLE_KEY la
 * entrada queda apagada.
 *
 * Cuerpo multipart:
 * - foto: la imagen (jpeg, png, webp o gif; hasta 10 MB)
 * - mensajeId: id del mensaje de WhatsApp (queda como nombre de la foto)
 * - enviado: hora del mensaje en milisegundos (opcional; decide el día)
 */

const MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

function tokenValido(dado: string | null): boolean {
  const esperado = process.env.AGENTE_TOKEN;
  if (!esperado || !dado) return false;
  // Comparar resúmenes del mismo largo: no se filtra por tiempo cuánto acertó.
  const a = createHash("sha256").update(dado).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

function diaBogota(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function refrescar() {
  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  revalidatePath("/historial");
}

export async function POST(req: Request) {
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenValido(dado)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const sb = crearClienteAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: "Entrada apagada" }, { status: 503 });
  const inicio = Date.now();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Se esperaba multipart" }, { status: 400 });
  }

  const foto = form.get("foto");
  if (!(foto instanceof File)) return NextResponse.json({ ok: false, error: "Falta la foto" }, { status: 400 });
  const mime = (MIMES as readonly string[]).includes(foto.type) ? foto.type : null;
  if (!mime) return NextResponse.json({ ok: false, error: "La foto no es una imagen" }, { status: 415 });
  if (foto.size === 0 || foto.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "La foto pesa demasiado" }, { status: 413 });
  }

  const mensajeId = String(form.get("mensajeId") ?? "").slice(0, 120) || null;
  const enviadoMs = Number(form.get("enviado"));
  const dia = Number.isFinite(enviadoMs) && enviadoMs > 0 ? diaBogota(enviadoMs) : hoyISO();
  const nombre = mensajeId ? `WhatsApp ${mensajeId}` : "WhatsApp";

  // La misma foto reenviada (reintento del puente) no se procesa dos veces
  // mientras siga pendiente. Si ya se guardó, la revisión la marca como repetida.
  if (mensajeId) {
    const { data: ya } = await sb.from("corr_soportes").select("id").eq("nombre", nombre).limit(1);
    if (ya && ya.length > 0) return NextResponse.json({ ok: true, resultado: "ya_recibida" });
  }

  const buffer = Buffer.from(await foto.arrayBuffer());

  // La lectura es lo que más tarda: arranca ya, mientras la foto se guarda.
  let msLectura: number | null = null;
  const lectura: Promise<Comprobante | Error | null> = lecturaDisponible()
    ? (() => {
        const t = Date.now();
        return leerComprobante(buffer, mime).then(
          (r) => ((msLectura = Date.now() - t), r),
          (e: unknown) => ((msLectura = Date.now() - t), e instanceof Error ? e : new Error(String(e))),
        );
      })()
    : Promise.resolve(null);
  const tiempos = () => ({ total: Date.now() - inicio, lectura: msLectura });

  // 1. La foto queda como soporte del día: si algo falla después, ahí está para cargarla a mano.
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const path = `luis/${dia}/${randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from(SOPORTES_BUCKET).upload(path, buffer, { contentType: mime, upsert: false });
  if (upErr) return NextResponse.json({ ok: false, error: "No se pudo guardar la foto" }, { status: 502 });

  const { data: soporte, error: soErr } = await sb
    .from("corr_soportes")
    .insert({ fecha: dia, path, tipo: "tirilla", contexto: "luis", nombre, mime, tamano: buffer.length, created_by: null })
    .select("id")
    .single();
  if (soErr || !soporte) {
    await sb.storage.from(SOPORTES_BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: "No se pudo registrar la foto" }, { status: 502 });
  }

  async function aRevisar(motivo: string, leido: Comprobante | null) {
    refrescar();
    const monto = leido?.monto ? `${formatCOP(leido.monto)} ` : "";
    await avisarAdmins(sb!, {
      title: "Comprobante por revisar",
      body: `${monto}${leido?.transaccion ?? ""}`.trim() + (monto || leido?.transaccion ? ". " : "") + motivo,
      url: `/luis?fecha=${dia}`,
      tag: `comprobante-${soporte!.id}`,
    });
    const ms = tiempos();
    console.info(`Agente, comprobante: revisar (${motivo}), total ${ms.total} ms, lectura ${ms.lectura ?? "-"} ms`);
    return NextResponse.json({ ok: true, resultado: "revisar", motivo, ms });
  }

  // 2. Esperar la lectura (ya iba corriendo).
  const resultado = await lectura;
  if (resultado === null) return aRevisar("La lectura de fotos no está activada", null);
  if (resultado instanceof Error) {
    console.error("Agente, lectura de comprobante:", resultado);
    return aRevisar("No se pudo leer la foto", null);
  }
  const leido = resultado;

  // 3. Decidir (lib/comprobante-auto.ts). Guardar la lectura en el soporte (la
  // revisión en la app no vuelve a pagarla) y consultar el día van a la vez.
  const fecha = fechaDeTirilla(leido.fecha, dia).fecha;
  const [, { data: cuadre }, { data: iguales }] = await Promise.all([
    sb.from("corr_soportes").update({ datos: leido }).eq("id", soporte.id),
    sb.from("corr_cuadres").select("estado").eq("fecha", fecha).maybeSingle(),
    typeof leido.monto === "number" && leido.hora
      ? sb.from("corr_consignaciones_luis").select("hora").eq("fecha", fecha).eq("monto", leido.monto)
      : Promise.resolve({ data: [] as { hora: string | null }[] }),
  ]);
  const yaRegistrada =
    !!leido.hora && (iguales ?? []).some((r) => (r.hora ?? "").slice(0, 5) === leido.hora!.slice(0, 5));
  const decision = decidirComprobante(leido, dia, { diaCerrado: cuadre?.estado === "cerrado", yaRegistrada });
  if (decision.accion === "revisar") return aRevisar(decision.motivo, leido);

  // 4. Guardar la consignación y quitar la foto, que ya cumplió (igual que la carga desde fotos).
  const { error: insErr } = await sb.from("corr_consignaciones_luis").insert({ ...decision.fila, created_by: null });
  if (insErr) {
    console.error("Agente, guardar consignación:", insErr);
    return aRevisar("No se pudo guardar la consignación", leido);
  }
  await Promise.all([
    sb.storage.from(SOPORTES_BUCKET).remove([path]),
    sb.from("corr_soportes").delete().eq("id", soporte.id),
  ]);
  refrescar();
  const ms = tiempos();
  console.info(`Agente, comprobante: guardado, total ${ms.total} ms, lectura ${ms.lectura ?? "-"} ms`);
  return NextResponse.json({ ok: true, resultado: "guardado", consignacion: decision.fila, ms });
}
