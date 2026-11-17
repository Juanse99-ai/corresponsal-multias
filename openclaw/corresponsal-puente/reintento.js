#!/usr/bin/env node
// Pone en OpenClaw el reintento de descarga de fotos de WhatsApp (17 nov 2026).
// OpenClaw baja cada foto una sola vez: si la red falla en ese instante, la
// foto se pierde. Este script cambia su módulo de WhatsApp para reintentar a
// los 3, 10 y 30 segundos. Sirve en Mac y en Windows, y hay que volver a
// correrlo después de cada actualización de OpenClaw (el puente avisa cuando
// falta). Guarda el original en ~/.openclaw/corresponsal-respaldo.
//
//   node reintento.js            aplica el cambio (si ya está, no hace nada)
//   openclaw gateway restart     para que OpenClaw lo cargue
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const MARCA = "corresponsal-reintento";

export const ORIGINAL = `	try {
		saveInboundMedia(await downloadInboundMedia(msg, sock, maxBytes, messageProjection[0]));
	} catch (error) {
		logMediaMaterializationFailure({
			messageId: msg.key?.id,
			mediaKind,
			mimeType: mediaType,
			failureStage: "direct",
			error
		});
		params.logVerbose(\`Inbound media download failed: \${String(error)}\`);
		body = formatInboundMediaUnavailableText({
			body,
			notice: "[whatsapp attachment unavailable]"
		});
	}`;

const CON_REINTENTO = `	// ${MARCA} (puesto con openclaw/corresponsal-puente/reintento.js): si la
	// descarga falla por la red, se reintenta a los 3, 10 y 30 s antes de darla
	// por perdida. Una actualización de OpenClaw lo quita.
	for (let intento = 0, esperas = [3e3, 1e4, 3e4];; intento++) try {
		saveInboundMedia(await downloadInboundMedia(msg, sock, maxBytes, messageProjection[0]));
		if (intento > 0) inboundMediaLogger.warn(\`${MARCA}: foto descargada en el reintento \${intento}\`, { messageId: msg.key?.id });
		break;
	} catch (error) {
		if (intento < esperas.length) {
			inboundMediaLogger.warn(\`${MARCA}: la descarga falló, reintento \${intento + 1} de \${esperas.length}\`, { messageId: msg.key?.id, error: sanitizeMediaErrorMessage(error) });
			await new Promise((r) => setTimeout(r, esperas[intento]));
			continue;
		}
		logMediaMaterializationFailure({
			messageId: msg.key?.id,
			mediaKind,
			mimeType: mediaType,
			failureStage: "direct",
			error
		});
		params.logVerbose(\`Inbound media download failed: \${String(error)}\`);
		body = formatInboundMediaUnavailableText({
			body,
			notice: "[whatsapp attachment unavailable]"
		});
		break;
	}`;

/**
 * El texto del módulo con el reintento puesto.
 * @returns "ya" si ya lo tenía, el texto nuevo, o null si no se encontró el bloque
 *          (OpenClaw cambió su código: hay que revisarlo a mano).
 */
export function conReintento(texto) {
  if (texto.includes(MARCA)) return "ya";
  const normal = texto.replace(/\r\n/g, "\n");
  if (!normal.includes(ORIGINAL)) return null;
  return normal.replace(ORIGINAL, CON_REINTENTO);
}

async function main() {
  const base = process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw");
  const proyectos = join(base, "npm", "projects");
  const archivos = [];
  for (const p of await readdir(proyectos).catch(() => [])) {
    if (!p.startsWith("openclaw-whatsapp")) continue;
    const dir = join(proyectos, p, "node_modules", "@openclaw", "whatsapp", "dist", ".setup");
    for (const f of await readdir(dir).catch(() => [])) if (f.endsWith(".mjs")) archivos.push(join(dir, f));
  }
  let tocados = 0;
  let descargan = 0;
  for (const ruta of archivos) {
    const texto = await readFile(ruta, "utf8");
    if (!texto.includes("downloadInboundMedia(")) continue;
    descargan++;
    const nuevo = conReintento(texto);
    if (nuevo === "ya") {
      console.log(`Ya tenía el reintento: ${basename(ruta)}`);
      continue;
    }
    if (nuevo === null) {
      console.error(`OpenClaw cambió su código y no encontré dónde ponerlo: ${ruta}`);
      process.exitCode = 1;
      continue;
    }
    const respaldo = join(base, "corresponsal-respaldo");
    await mkdir(respaldo, { recursive: true });
    await copyFile(ruta, join(respaldo, `${basename(ruta)}.original`));
    await writeFile(ruta, nuevo);
    tocados++;
    console.log(`Reintento puesto: ${basename(ruta)}`);
  }
  if (descargan === 0) {
    console.error(`No encontré el módulo de WhatsApp de OpenClaw en ${proyectos}. ¿Ya vinculaste WhatsApp?`);
    process.exitCode = 1;
  } else if (tocados > 0) {
    console.log("Listo. Ahora: openclaw gateway restart");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo poner el reintento:", e?.message ?? e);
    process.exit(1);
  });
}
