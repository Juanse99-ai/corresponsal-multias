#!/usr/bin/env node
// Resumen del grupo (19 nov 2026, lo pidió el dueño): lo corre una tarea de
// OpenClaw a las 6:00 p. m. (tipo comando, sin IA) y OpenClaw le manda al
// dueño lo que este script imprime: cuántas fotos llegaron al grupo y cómo
// quedaron, las compensaciones del Sr. Luis, lo que quedó por revisar, las
// fotos que no se pudieron descargar y lo que escribieron.
//
// Lee el diario que llena el puente (~/.openclaw/corresponsal-grupo.jsonl) y
// deja solo los últimos 7 días. Si hoy no llegó nada, también lo dice: así se
// nota si el puente dejó de ver el grupo.
import { appendFile, readFile, rename, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { rutaDiario, horaBogota } from "./puente.js";

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const MAX_TEXTOS = 15;

const pesos = (n) => "$" + Math.round(Math.abs(Number(n) || 0)).toLocaleString("es-CO");

/** Día (YYYY-MM-DD) de un instante en Bogotá. */
export function diaBogota(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(ms));
}

/** Las líneas del diario que se pueden leer, en orden de hora. */
export function leerDiario(texto) {
  const eventos = [];
  for (const linea of String(texto).split("\n")) {
    if (!linea.trim()) continue;
    try {
      const e = JSON.parse(linea);
      if (typeof e?.ts === "number" && typeof e?.tipo === "string") eventos.push(e);
    } catch {
      // Una línea rota no cuenta.
    }
  }
  return eventos.sort((a, b) => a.ts - b.ts);
}

const corto = (t, n = 120) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

/** El mensaje de WhatsApp con lo que pasó en el grupo ese día. */
export function resumenGrupo(eventos, dia) {
  const hoy = eventos.filter((e) => diaBogota(e.ts) === dia);
  const fotos = hoy.filter((e) => e.tipo === "foto" && e.resultado !== "ya_recibida");
  const comps = hoy.filter((e) => e.tipo === "compensacion" && e.resultado !== "ya_recibida" && e.resultado !== "descartada");
  const perdidas = hoy.filter((e) => e.tipo === "perdida");
  const textos = hoy.filter((e) => e.tipo === "texto");

  const lineas = ["*Corresponsal · el grupo hoy*"];
  if (fotos.length + comps.length + perdidas.length + textos.length === 0) {
    lineas.push("Hoy no llegó nada al grupo. Si sí mandaron fotos, el puente no las está viendo: revisa el Mac.");
    return lineas.join("\n");
  }

  if (fotos.length > 0) {
    const guardadas = fotos.filter((e) => e.resultado === "guardado");
    const partes = [`${guardadas.length} registradas`];
    const revisar = fotos.filter((e) => e.resultado === "revisar").length;
    const descartadas = fotos.filter((e) => e.resultado === "descartada").length;
    const noLlegaron = fotos.filter((e) => e.resultado === "no_llego").length;
    if (revisar) partes.push(`${revisar} por revisar`);
    if (descartadas) partes.push(`${descartadas} descartadas`);
    if (noLlegaron) partes.push(`${noLlegaron} no llegaron a la app`);
    lineas.push(`Fotos: ${fotos.length} (${partes.join(", ")})`);
    const porQuien = new Map();
    for (const e of fotos) {
      const q = porQuien.get(e.quien) ?? { n: 0, suma: 0 };
      q.n += 1;
      if (e.resultado === "guardado") q.suma += Number(e.monto) || 0;
      porQuien.set(e.quien, q);
    }
    for (const [quien, q] of porQuien) {
      lineas.push(`- ${quien}: ${q.n} ${q.n === 1 ? "foto" : "fotos"}${q.suma ? `, ${pesos(q.suma)} registrados` : ""}`);
    }
  } else {
    lineas.push("Fotos: ninguna");
  }

  if (comps.length > 0) {
    const guardadas = comps.filter((e) => e.resultado === "guardado");
    const suma = guardadas.reduce((s, e) => s + (Number(e.monto) || 0), 0);
    const pendientes = comps.length - guardadas.length;
    const partes = [];
    if (guardadas.length) partes.push(`${guardadas.length} guardadas (${pesos(suma)})`);
    if (pendientes) partes.push(`${pendientes} por confirmar`);
    lineas.push(`Compensaciones del Sr. Luis: ${partes.join(", ")}`);
  }

  const porRevisar = [...fotos, ...comps].filter((e) => e.resultado === "revisar" || e.resultado === "no_llego");
  if (porRevisar.length > 0) {
    lineas.push("", "Por revisar en la app:");
    for (const e of porRevisar) {
      const motivo = e.resultado === "no_llego" ? "no llegó a la app, súbela a mano" : corto(e.motivo || "sin motivo", 80);
      lineas.push(`- ${horaBogota(e.ts)} ${e.quien}: ${motivo}`);
    }
  }

  if (perdidas.length > 0) {
    lineas.push("", "No se pudieron descargar (regístralas a mano):");
    for (const e of perdidas) {
      const n = Number(e.cuantas) || 1;
      lineas.push(`- ${horaBogota(e.ts)} ${e.quien}: ${n === 1 ? "1 foto" : `${n} fotos`}`);
    }
  }

  if (textos.length > 0) {
    lineas.push("", "Lo que escribieron:");
    const ultimos = textos.slice(-MAX_TEXTOS);
    if (textos.length > ultimos.length) lineas.push(`(los últimos ${ultimos.length} de ${textos.length})`);
    for (const e of ultimos) lineas.push(`- ${horaBogota(e.ts)} ${e.quien}: ${corto(e.texto)}`);
  }

  return lineas.join("\n");
}

async function main() {
  const ahora = Date.now();
  const diario = rutaDiario();
  // Se mueve aparte antes de leerlo: lo que anote el puente mientras tanto no se pierde.
  const tomado = `${diario}.${process.pid}`;
  let texto = "";
  try {
    await rename(diario, tomado);
    texto = await readFile(tomado, "utf8");
  } catch {
    // Sin diario: hoy no llegó nada.
  }
  const eventos = leerDiario(texto);
  const recientes = eventos.filter((e) => ahora - e.ts < SIETE_DIAS);
  if (recientes.length > 0) await appendFile(diario, recientes.map((e) => JSON.stringify(e)).join("\n") + "\n");
  await rm(tomado, { force: true });
  process.stdout.write(resumenGrupo(recientes, diaBogota(ahora)) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("No se pudo armar el resumen del grupo:", e?.message ?? e);
    process.exit(1);
  });
}
