#!/usr/bin/env node
// Avisos a una operadora por WhatsApp (12 nov 2026, lo pidió el dueño): lo
// corre una tarea programada de OpenClaw cada 5 minutos con el número de la
// operadora (`node operadoras.js +57...`), y OpenClaw le manda lo que este
// script imprime. Si no hay nada para ella, no imprime nada y no se manda nada.
// OpenClaw está vinculado al WhatsApp del dueño: el mensaje le llega desde ese
// número, por eso empieza con "Corresponsal".
//
// Lee la bandeja que llena el puente (~/.openclaw/corresponsal-operadoras.jsonl):
// la mueve aparte antes de leerla (así lo que anote el puente mientras tanto no
// se pierde) y devuelve a la bandeja lo que es para otras operadoras.
import { appendFile, readFile, rename, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { rutaBandeja } from "./puente.js";

const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");

/** Separa las líneas de la bandeja: las de ese número y las demás (en texto, tal cual). */
export function repartir(texto, numero) {
  const mio = soloDigitos(numero).slice(-10);
  const para = [];
  const otras = [];
  for (const linea of String(texto).split("\n")) {
    if (!linea.trim()) continue;
    try {
      const m = JSON.parse(linea);
      if (mio && soloDigitos(m.para).endsWith(mio) && typeof m.texto === "string") para.push(m.texto);
      else otras.push(linea);
    } catch {
      // Una línea rota no se manda ni se guarda.
    }
  }
  return { para, otras };
}

/** El mensaje de WhatsApp para la operadora, o vacío si no hay nada. */
export function textoOperadora(mensajes) {
  if (mensajes.length === 0) return "";
  return `*Corresponsal*\n${mensajes.join("\n")}`;
}

async function main() {
  const numero = process.argv[2];
  if (!soloDigitos(numero)) {
    console.error("Falta el número de la operadora: node operadoras.js +57...");
    process.exit(1);
  }
  const bandeja = rutaBandeja();
  const tomada = `${bandeja}.${process.pid}`;
  try {
    await rename(bandeja, tomada);
  } catch {
    return; // Sin bandeja: no hay nada que avisar.
  }
  const { para, otras } = repartir(await readFile(tomada, "utf8"), numero);
  if (otras.length > 0) await appendFile(bandeja, otras.join("\n") + "\n");
  await rm(tomada, { force: true });
  const texto = textoOperadora(para);
  if (texto) process.stdout.write(texto + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo leer la bandeja de avisos:", e?.message ?? e);
    process.exit(1);
  });
}
