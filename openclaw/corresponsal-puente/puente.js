// Puente del corresponsal (plugin de OpenClaw).
//
// Qué hace, sin IA de por medio:
// 1. Cada foto que el dueño manda en el grupo Corresponsal se reenvía a la App
//    Corresponsal (/api/agente/comprobante). La app la lee y decide: lo seguro
//    queda como consignación del Sr. Luis; lo dudoso, pendiente con aviso.
//    Las fotos que manda el Sr. Luis (config.luis) van con su texto ("21.8
//    palos") a /api/agente/compensacion: son compensaciones.
// 2. Ningún mensaje de ese grupo llega al agente (before_dispatch lo reclama).
// 3. Ningún envío hacia ese grupo sale (message_sending y reply_payload_sending
//    lo cancelan). En el grupo hay clientes: el agente nunca habla ahí.
//
// Configuración en ~/.openclaw/openclaw.json, plugins.entries.corresponsal-puente.config:
//   grupo, dueno, luis, url, urlCompensacion, token, diagnostico
//   (ver openclaw.plugin.json y README.md).
import { readFile } from "node:fs/promises";

const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");

const IMAGEN = /^image\/(jpeg|png|webp|gif)$/;

function tipoDeFoto(m) {
  const t = String(m?.contentType ?? "").toLowerCase().split(";")[0].trim();
  if (IMAGEN.test(t)) return t;
  if (m?.kind === "image") {
    const ruta = String(m.path ?? "").toLowerCase();
    if (ruta.endsWith(".png")) return "image/png";
    if (ruta.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }
  return null;
}

/** Hora del mensaje en milisegundos (algunos canales la dan en segundos). */
function enMs(t) {
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** El texto del mensaje sin las marcas de adjunto que pone OpenClaw ("<media:image>"). */
export function textoDelMensaje(event) {
  const t = event?.content ?? event?.body ?? event?.text ?? "";
  return String(typeof t === "string" ? t : "")
    .replace(/<media:[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** La entrada de compensaciones, al lado de la de comprobantes. */
export function urlDeCompensacion(url) {
  return String(url ?? "").replace(/\/comprobante\/?$/, "/compensacion");
}

/** El remitente es ese número: compara los últimos 10 dígitos (o todos, si tiene menos). */
function esNumero(remitente, numero) {
  if (!numero) return false;
  return soloDigitos(remitente).endsWith(numero.slice(-10));
}

export const puente = {
  id: "corresponsal-puente",
  name: "Puente del corresponsal",
  description: "Reenvía las fotos del grupo Corresponsal a la App Corresponsal y bloquea cualquier mensaje al grupo.",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    const log = api.logger ?? console;
    const grupo = String(cfg.grupo ?? "").trim();
    const dueno = soloDigitos(cfg.dueno);
    const luis = soloDigitos(cfg.luis);
    const url = String(cfg.url ?? "").trim();
    const urlComp = String(cfg.urlCompensacion ?? "").trim() || urlDeCompensacion(url);
    const token = String(cfg.token ?? "").trim();
    const diagnostico = cfg.diagnostico === true;

    if (!grupo) {
      log.error?.("[corresponsal-puente] Falta config.grupo: el puente no hace nada.");
      return;
    }
    // Sin grupo no hay nada que bloquear; con grupo, el bloqueo va siempre,
    // aunque falte la url o el token del reenvío.
    const esDelGrupo = (...valores) => valores.some((v) => typeof v === "string" && v.includes(grupo));

    // ---- 1. Bloqueo: nada sale hacia el grupo ----
    api.on(
      "message_sending",
      (event, ctx) => {
        if (esDelGrupo(event?.to, ctx?.conversationId, ctx?.sessionKey)) {
          log.warn?.("[corresponsal-puente] Envío al grupo cancelado.");
          return { cancel: true, cancelReason: "corresponsal-puente: el agente no escribe en el grupo" };
        }
      },
      { priority: 1000 },
    );
    api.on(
      "reply_payload_sending",
      (event, ctx) => {
        if (esDelGrupo(ctx?.conversationId, ctx?.sessionKey, event?.sessionKey)) {
          log.warn?.("[corresponsal-puente] Respuesta al grupo cancelada.");
          return { cancel: true, reason: "corresponsal-puente: el agente no escribe en el grupo" };
        }
      },
      { priority: 1000 },
    );

    // ---- 2. El agente no procesa nada del grupo ----
    api.on(
      "before_dispatch",
      (event, ctx) => {
        if (esDelGrupo(ctx?.conversationId, ctx?.sessionKey, event?.sessionKey)) return { handled: true };
      },
      { priority: 1000 },
    );

    // ---- 3. Reenvío de las fotos del dueño ----
    if (!url || !token || !dueno) {
      log.error?.("[corresponsal-puente] Falta config.url, config.token o config.dueno: no se reenvían fotos (el bloqueo sí está activo).");
      return;
    }

    async function enviar(foto, tipo, mensajeId, enviado, destino, texto) {
      const datos = await readFile(foto.path);
      const que = destino === urlComp ? "Compensación" : "Foto";
      for (let intento = 1; intento <= 3; intento++) {
        try {
          const form = new FormData();
          form.append("foto", new Blob([datos], { type: tipo }), `comprobante.${tipo.split("/")[1]}`);
          if (mensajeId) form.append("mensajeId", mensajeId);
          if (texto) form.append("texto", texto);
          if (enviado) form.append("enviado", String(enviado));
          const res = await fetch(destino, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
            // La entrada nunca redirige. Si hay redirección es que la versión
            // publicada no la tiene y la app manda a la pantalla de entrar
            // (pasó el 11 nov 2026): seguirla terminaba en un 500 confuso.
            redirect: "manual",
            signal: AbortSignal.timeout(90_000),
          });
          if (res.status >= 300 && res.status < 400) {
            log.error?.(
              `[corresponsal-puente] La app publicada no tiene la entrada del agente (redirige a ${res.headers.get("location") ?? "otra página"}). ` +
                "Revisa en Vercel que producción tenga la última versión de main. Sube esta foto a mano.",
            );
            return;
          }
          const cuerpo = await res.json().catch(() => ({}));
          if (res.ok) {
            const seg = (ms) => (typeof ms === "number" ? `${(ms / 1000).toFixed(1)} s` : "-");
            const tiempo = cuerpo.ms ? `, ${seg(cuerpo.ms.total)} en la app (lectura ${seg(cuerpo.ms.lectura)})` : "";
            log.info?.(
              `[corresponsal-puente] ${que} ${mensajeId ?? ""}: ${cuerpo.resultado ?? "ok"}${cuerpo.motivo ? ` (${cuerpo.motivo})` : ""}${tiempo}`,
            );
            return;
          }
          if (res.status === 401) {
            log.error?.(
              "[corresponsal-puente] La app no aceptó la clave: config.token del plugin no coincide con AGENTE_TOKEN de Vercel " +
                "(o falta volver a desplegar después de cambiarla). Sube esta foto a mano.",
            );
            return;
          }
          if (res.status === 503) {
            log.error?.(
              "[corresponsal-puente] La entrada del agente está apagada: falta AGENTE_TOKEN o SUPABASE_SERVICE_ROLE_KEY en Vercel. Sube esta foto a mano.",
            );
            return;
          }
          // 4xx no se arregla reintentando (token malo, foto rara).
          if (res.status < 500) {
            log.error?.(`[corresponsal-puente] La app rechazó la foto (${res.status}): ${cuerpo.error ?? ""}`);
            return;
          }
          log.warn?.(`[corresponsal-puente] La app respondió ${res.status}, intento ${intento} de 3.`);
        } catch (e) {
          log.warn?.(`[corresponsal-puente] Sin respuesta de la app, intento ${intento} de 3: ${e?.message ?? e}`);
        }
        if (intento < 3) await espera(intento * 5_000);
      }
      log.error?.(`[corresponsal-puente] No se pudo entregar la foto ${mensajeId ?? ""}. Súbela a mano en la app.`);
    }

    api.on("message_received", async (event, ctx) => {
      if (!esDelGrupo(ctx?.conversationId, ctx?.sessionKey, event?.sessionKey, event?.from)) return;

      const remitente = ctx?.senderId ?? event?.senderId ?? event?.from;
      const media = Array.isArray(event?.media) ? event.media : [];
      if (diagnostico) {
        // Sin contenido ni números completos: solo lo necesario para ajustar el puente.
        log.info?.(
          `[corresponsal-puente] diagnóstico: conversationId=${ctx?.conversationId ?? "-"} ` +
            `remitente termina en ${soloDigitos(remitente).slice(-4) || "-"} ` +
            `fotos=${media.length} pendiente=${event?.mediaStagingPending === true} ` +
            `tipos=${media.map((m) => m?.contentType ?? m?.kind ?? "?").join(",") || "-"}`,
        );
      }

      const deLuis = esNumero(remitente, luis);
      if (!deLuis && !esNumero(remitente, dueno)) return;
      const destino = deLuis ? urlComp : url;
      const texto = deLuis ? textoDelMensaje(event) : null;
      if (event?.mediaStagingPending) {
        log.warn?.("[corresponsal-puente] La foto todavía no se había descargado; no se reenvió. Súbela a mano si no aparece.");
        return;
      }

      const mensajeId = event?.messageId ?? ctx?.messageId ?? null;
      const enviado = enMs(event?.timestamp);
      const fotos = media
        .map((m, i) => ({ m, i, tipo: tipoDeFoto(m) }))
        .filter((f) => f.tipo && typeof f.m?.path === "string" && f.m.path);
      for (const f of fotos) {
        const id = mensajeId ? (fotos.length > 1 ? `${mensajeId}-${f.i}` : mensajeId) : null;
        try {
          await enviar(f.m, f.tipo, id, enviado, destino, texto);
        } catch (e) {
          log.error?.(`[corresponsal-puente] No se pudo leer la foto del disco: ${e?.message ?? e}`);
        }
      }
    });

    log.info?.(
      `[corresponsal-puente] Activo: bloqueo del grupo y reenvío de fotos${luis ? " (y compensaciones del Sr. Luis)" : ""}.`,
    );
  },
};
