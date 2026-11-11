#!/usr/bin/env node
// Resumen de las 7 a.m.: lo corre una tarea programada de OpenClaw (tipo
// comando, sin IA) y OpenClaw manda al WhatsApp del dueño lo que este script
// imprime. Ver README.md, sección "Resumen de las 7".
//
// Lee la url y la clave del plugin en ~/.openclaw/openclaw.json (las mismas del
// reenvío de fotos) y pide el texto a /api/agente/resumen. No usa
// `openclaw config get`: esa salida muestra la clave tapada.
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Saca { url, token } del bloque corresponsal-puente de openclaw.json (JSON o JSON5 sencillo). */
export function configDelPuente(texto) {
  try {
    const cfg = JSON.parse(texto)?.plugins?.entries?.["corresponsal-puente"]?.config;
    if (cfg?.url && cfg?.token) return { url: String(cfg.url), token: String(cfg.token) };
  } catch {
    // JSON5 con comentarios o comas finales: se busca a mano abajo.
  }
  const i = texto.indexOf("corresponsal-puente");
  if (i < 0) return null;
  const bloque = texto.slice(i, i + 4000);
  const valor = (clave) => bloque.match(new RegExp(`["']?${clave}["']?\\s*:\\s*["']([^"']+)["']`))?.[1];
  const url = valor("url");
  const token = valor("token");
  return url && token ? { url, token } : null;
}

/** La url configurada es la de comprobantes; el resumen vive al lado. */
export function urlResumen(urlComprobante) {
  return urlComprobante.replace(/\/comprobante\/?$/, "/resumen");
}

async function main() {
  const ruta = join(process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw"), "openclaw.json");
  const cfg = configDelPuente(await readFile(ruta, "utf8"));
  if (!cfg) {
    console.error("No encontré url y token de corresponsal-puente en", ruta);
    process.exit(1);
  }
  const res = await fetch(urlResumen(cfg.url), {
    headers: { Authorization: `Bearer ${cfg.token}` },
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  const texto = await res.text();
  if (!res.ok) {
    // Va al registro de la tarea; OpenClaw la marca como fallida.
    console.error(`La app respondió ${res.status}: ${texto.slice(0, 200)}`);
    process.exit(1);
  }
  process.stdout.write(texto.trim() + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo pedir el resumen:", e?.message ?? e);
    process.exit(1);
  });
}
