#!/usr/bin/env node
// Avisos al dueño (12 nov 2026): lo corre una tarea programada de OpenClaw cada
// 15 minutos (tipo comando, sin IA) y OpenClaw manda al WhatsApp del dueño lo
// que este script imprime. Si no imprime nada, no se manda nada. Ver
// README.md, sección "Avisos por WhatsApp".
//
// Pide a /api/agente/avisos las fotos que quedaron por revisar desde la última
// vuelta y guarda hasta dónde llegó (la hora la pone el servidor) en
// ~/.openclaw/corresponsal-avisos.json. La url y la clave salen del plugin,
// como en resumen.js.
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { configDelPuente } from "./resumen.js";

/** La url configurada es la de comprobantes; los avisos viven al lado. */
export function urlAvisos(urlComprobante, desde) {
  const base = urlComprobante.replace(/\/comprobante\/?$/, "/avisos");
  return desde ? `${base}?desde=${encodeURIComponent(desde)}` : base;
}

/** Hasta dónde llegó la última vuelta (ISO), o null si es la primera. */
export function leerEstado(texto) {
  try {
    const hasta = JSON.parse(texto)?.hasta;
    return typeof hasta === "string" && Number.isFinite(Date.parse(hasta)) ? hasta : null;
  } catch {
    return null;
  }
}

async function main() {
  const dir = process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw");
  const cfg = configDelPuente(await readFile(join(dir, "openclaw.json"), "utf8"));
  if (!cfg) {
    console.error("No encontré url y token de corresponsal-puente en", join(dir, "openclaw.json"));
    process.exit(1);
  }
  const archivoEstado = join(dir, "corresponsal-avisos.json");
  const desde = leerEstado(await readFile(archivoEstado, "utf8").catch(() => ""));

  const res = await fetch(urlAvisos(cfg.url, desde), {
    headers: { Authorization: `Bearer ${cfg.token}` },
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok || !cuerpo.ok) {
    // Va al registro de la tarea; OpenClaw la marca como fallida. No se avanza
    // el estado: la próxima vuelta vuelve a mirar desde el mismo punto.
    console.error(`La app respondió ${res.status}: ${cuerpo.error ?? ""}`);
    process.exit(1);
  }
  // Primero se guarda hasta dónde se llegó; si se cae después, a lo sumo un aviso no sale.
  if (typeof cuerpo.hasta === "string") await writeFile(archivoEstado, JSON.stringify({ hasta: cuerpo.hasta }) + "\n");
  if (cuerpo.texto) process.stdout.write(String(cuerpo.texto).trim() + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudieron pedir los avisos:", e?.message ?? e);
    process.exit(1);
  });
}
