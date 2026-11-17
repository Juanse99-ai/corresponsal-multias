#!/usr/bin/env node
// Exporta la configuración del puente para mudarlo a otro equipo (17 nov 2026).
// Escribe corresponsal-config.json5 con el bloque del plugin (grupo, números,
// url y CLAVE del agente) y la configuración de WhatsApp. En el equipo nuevo:
//   openclaw config patch --file corresponsal-config.json5
// El archivo lleva la clave: pásalo en una memoria USB o en mano y bórralo al
// terminar. No lo mandes por chat ni lo subas a ningún lado.
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Lo de WhatsApp que se lleva: quién puede escribir, el grupo y los ajustes. */
const CLAVES_WHATSAPP = [
  "dmPolicy",
  "allowFrom",
  "selfChatMode",
  "groupPolicy",
  "groups",
  "groupAllowFrom",
  "pluginHooks",
  "sendReadReceipts",
  "historyLimit",
  "mediaMaxMb",
  "reactionLevel",
];

export function parcheDeMudanza(config) {
  const puente = config?.plugins?.entries?.["corresponsal-puente"]?.config;
  if (!puente?.url || !puente?.token) throw new Error("No encontré la configuración del puente (url y token).");
  const wa = config?.channels?.whatsapp ?? {};
  const whatsapp = Object.fromEntries(CLAVES_WHATSAPP.filter((k) => k in wa).map((k) => [k, wa[k]]));
  return {
    plugins: { entries: { "corresponsal-puente": { enabled: true, config: puente } } },
    channels: { whatsapp },
  };
}

async function main() {
  const ruta = join(process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw"), "openclaw.json");
  const parche = parcheDeMudanza(JSON.parse(await readFile(ruta, "utf8")));
  const salida = process.argv[2] ?? "corresponsal-config.json5";
  await writeFile(salida, JSON.stringify(parche, null, 2) + "\n", { mode: 0o600 });
  console.log(`Escribí ${salida}. Lleva la clave del agente: pásalo en mano y bórralo después.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo exportar:", e?.message ?? e);
    process.exit(1);
  });
}
