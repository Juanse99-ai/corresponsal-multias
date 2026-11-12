#!/usr/bin/env node
// Recordatorio de cierre (12 nov 2026): lo corre una tarea programada de
// OpenClaw a las 4:55 p. m. (tipo comando, sin IA) y OpenClaw manda al WhatsApp
// del dueño lo que este script imprime. Si el día ya está cerrado y cuadrado
// la app responde vacío y no se manda nada. Ver README.md, sección
// "Avisos por WhatsApp".
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { configDelPuente } from "./resumen.js";

/** La url configurada es la de comprobantes; el cierre vive al lado. */
export function urlCierre(urlComprobante) {
  return urlComprobante.replace(/\/comprobante\/?$/, "/cierre");
}

async function main() {
  const ruta = join(process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw"), "openclaw.json");
  const cfg = configDelPuente(await readFile(ruta, "utf8"));
  if (!cfg) {
    console.error("No encontré url y token de corresponsal-puente en", ruta);
    process.exit(1);
  }
  const res = await fetch(urlCierre(cfg.url), {
    headers: { Authorization: `Bearer ${cfg.token}` },
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  const texto = await res.text();
  if (!res.ok) {
    console.error(`La app respondió ${res.status}: ${texto.slice(0, 200)}`);
    process.exit(1);
  }
  if (texto.trim()) process.stdout.write(texto.trim() + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo pedir el recordatorio de cierre:", e?.message ?? e);
    process.exit(1);
  });
}
