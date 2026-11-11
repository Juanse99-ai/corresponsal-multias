import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { SOPORTES_BUCKET } from "@/lib/queries";
import { lecturaDisponible } from "@/lib/leer-comprobante";
import { leerCompensacion, type LecturaCompensacion } from "@/lib/leer-compensacion";
import { decidirCompensacion, CONTEXTO_COMPENSACION, type DecisionCompensacion } from "@/lib/compensacion";
import { avisarAdmins } from "@/lib/avisos";
import { tokenValido, diaBogota, horaBogota } from "@/lib/agente";
import { formatCOP, formatFecha } from "@/lib/format";
import type { Json } from "@/lib/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Entrada del agente para las compensaciones del Sr. Luis (11 nov 2026): la
 * foto con los pagos que Luis manda al grupo del corresponsal, con su texto
 * ("21.8 palos nuevo"). La reenvía el puente de OpenClaw.
 *
 * Se registra el día en que Luis la manda, con el monto exacto de cada pago.
 * Mientras COMPENSACIONES_AUTO no sea "1" todo queda por confirmar en la
 * Cuenta del Sr. Luis ("Por confirmar"), con aviso a los administradores; con
 * "1", lo que cuadra con los palos y no tiene dudas se guarda solo. La
 * decisión está en lib/compensacion.ts (probada en test/).
 *
 * Cuerpo multipart (misma clave que /api/agente/comprobante):
 * - foto: la imagen (jpeg, png, webp o gif; hasta 10 MB)
 * - texto: lo que Luis escribió con la foto (opcional)
 * - mensajeId: id del mensaje de WhatsApp
 * - enviado: hora del mensaje en milisegundos (decide el día)
 */

const MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 10 * 1024 * 1024;
/** Días hacia atrás en que se buscan comprobantes repetidos. */
const DIAS_REPETIDOS = 7;

function refrescar() {
  revalidatePath("/luis");
  revalidatePath("/cuadre");
  revalidatePath("/panel");
  revalidatePath("/historial");
}

function diasAntes(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  if (!tokenValido(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

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

  const texto = String(form.get("texto") ?? "").trim().slice(0, 300) || null;
  const mensajeId = String(form.get("mensajeId") ?? "").slice(0, 120) || null;
  const enviadoNum = Number(form.get("enviado"));
  const enviadoMs = Number.isFinite(enviadoNum) && enviadoNum > 0 ? enviadoNum : Date.now();
  // Regla del dueño: la compensación va el día en que Luis la manda.
  const dia = diaBogota(enviadoMs);
  const horaMensaje = horaBogota(enviadoMs);
  const nombre = mensajeId ? `WhatsApp ${mensajeId}` : "WhatsApp";

  // La misma foto reenviada (reintento del puente) no se procesa dos veces.
  if (mensajeId) {
    const { data: ya } = await sb.from("corr_soportes").select("id").eq("nombre", nombre).limit(1);
    if (ya && ya.length > 0) return NextResponse.json({ ok: true, resultado: "ya_recibida" });
  }

  const buffer = Buffer.from(await foto.arrayBuffer());

  // La lectura es lo que más tarda: arranca ya, mientras la foto se guarda.
  let msLectura: number | null = null;
  const lectura: Promise<LecturaCompensacion | Error | null> = lecturaDisponible()
    ? (() => {
        const t = Date.now();
        return leerCompensacion(buffer, mime).then(
          (r) => ((msLectura = Date.now() - t), r),
          (e: unknown) => ((msLectura = Date.now() - t), e instanceof Error ? e : new Error(String(e))),
        );
      })()
    : Promise.resolve(null);
  const tiempos = () => ({ total: Date.now() - inicio, lectura: msLectura });

  // 1. La foto queda guardada aparte (contexto luis-comp): es lo que se confirma en la app.
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const path = `${CONTEXTO_COMPENSACION}/${dia}/${randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from(SOPORTES_BUCKET).upload(path, buffer, { contentType: mime, upsert: false });
  if (upErr) return NextResponse.json({ ok: false, error: "No se pudo guardar la foto" }, { status: 502 });

  const { data: soporte, error: soErr } = await sb
    .from("corr_soportes")
    .insert({
      fecha: dia,
      path,
      tipo: "compensacion",
      contexto: CONTEXTO_COMPENSACION,
      nombre,
      mime,
      tamano: buffer.length,
      datos: { tipo: "compensacion", texto, horaMensaje } as Json,
      created_by: null,
    })
    .select("id")
    .single();
  if (soErr || !soporte) {
    await sb.storage.from(SOPORTES_BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: "No se pudo registrar la foto" }, { status: 502 });
  }

  async function aConfirmar(motivo: string, d: DecisionCompensacion | null) {
    refrescar();
    const cifra = d && d.suma > 0 ? `${formatCOP(d.suma)}${d.palos !== null ? (d.cuadra ? ", cuadra con los palos" : ", no cuadra con los palos") : ""}. ` : "";
    await avisarAdmins(sb!, {
      title: "Compensación por confirmar",
      body: `${cifra}${motivo}. Llegó el ${formatFecha(dia)}.`,
      url: `/luis?fecha=${dia}#por-confirmar`,
      tag: `compensacion-${soporte!.id}`,
    });
    const ms = tiempos();
    console.info(`Agente, compensación: confirmar (${motivo}), total ${ms.total} ms, lectura ${ms.lectura ?? "-"} ms`);
    return NextResponse.json({ ok: true, resultado: "revisar", motivo, ms });
  }

  // 2. Esperar la lectura (ya iba corriendo).
  const resultado = await lectura;
  if (resultado === null) return aConfirmar("La lectura de fotos no está activada", null);
  if (resultado instanceof Error) {
    console.error("Agente, lectura de compensación:", resultado);
    return aConfirmar("No se pudo leer la foto", null);
  }

  // 3. Decidir. Se consultan el día y los comprobantes de la última semana.
  const [{ data: cuadre }, { data: recientes }] = await Promise.all([
    sb.from("corr_cuadres").select("estado").eq("fecha", dia).maybeSingle(),
    sb.from("corr_compensaciones_luis").select("nota").gte("fecha", diasAntes(dia, DIAS_REPETIDOS)),
  ]);
  const comprobantesRegistrados = (recientes ?? [])
    .map((r) => r.nota?.match(/comprobante (\S+)/i)?.[1] ?? "")
    .filter(Boolean);
  const pagos = resultado.hay_pagos ? resultado.pagos : [];
  const decision = decidirCompensacion(pagos, texto, dia, horaMensaje, {
    automatico: process.env.COMPENSACIONES_AUTO?.trim() === "1",
    diaCerrado: cuadre?.estado === "cerrado",
    comprobantesRegistrados,
  });

  // La lectura y la decisión quedan en la foto: la confirmación no vuelve a pagar la lectura.
  await sb
    .from("corr_soportes")
    .update({ datos: { tipo: "compensacion", texto, horaMensaje, pagos, decision } as unknown as Json })
    .eq("id", soporte.id);

  if (decision.accion === "revisar") return aConfirmar(decision.motivo, decision);

  // 4. Guardar las compensaciones y quitar la foto, que ya cumplió.
  const { error: insErr } = await sb
    .from("corr_compensaciones_luis")
    .insert(decision.filas.map((f) => ({ ...f, created_by: null })));
  if (insErr) {
    console.error("Agente, guardar compensación:", insErr);
    return aConfirmar("No se pudo guardar la compensación", decision);
  }
  await Promise.all([
    sb.storage.from(SOPORTES_BUCKET).remove([path]),
    sb.from("corr_soportes").delete().eq("id", soporte.id),
  ]);
  refrescar();
  const ms = tiempos();
  console.info(`Agente, compensación: guardada, total ${ms.total} ms, lectura ${ms.lectura ?? "-"} ms`);
  return NextResponse.json({ ok: true, resultado: "guardado", suma: decision.suma, pagos: decision.filas.length, ms });
}
