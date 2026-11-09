// Reglas de sistema de Biela que se revisan solas en cada `npm test`
// (DESIGN.md, «Reglas de Biela»): cinco tamaños de letra y dos pesos, tiempos
// con nombre, tres cortes de pantalla y capas con nombre.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
// Las imágenes que se exportan (cuadre y reporte del Sr. Luis) conservan su
// formato de hoja de cálculo, como los PDF de Biela.
const EXENTOS = /(cuadre-export|reporte-luis)\.tsx$/;

function archivos(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return archivos(p, ext);
    return ext.test(n) ? [p] : [];
  });
}

const tsx = () =>
  ["app", "components", "lib"].flatMap((d) => archivos(join(raiz, d), /\.tsx?$/)).filter((f) => !EXENTOS.test(f));
const css = readFileSync(join(raiz, "app/globals.css"), "utf8");

function buscar(lista: string[], patron: RegExp) {
  const malos: string[] = [];
  for (const f of lista) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((l, i) => {
        if (patron.test(l)) malos.push(`${relative(raiz, f)}:${i + 1}  ${l.trim().slice(0, 120)}`);
      });
  }
  return malos;
}

test("dos pesos de letra: 400 y 500", () => {
  const malos = buscar(tsx(), /\bfont-(semibold|bold|extrabold|black)\b|fontWeight:\s*["']?[6-9]00/);
  const enCss = css.split("\n").filter((l) => /font-weight:\s*([6-9]00|bold)/.test(l));
  assert.deepEqual([...malos, ...enCss], []);
});

test("cinco tamaños de letra (más 16 en los campos y 10 en la barra de abajo)", () => {
  const malos = buscar(
    tsx(),
    /\btext-(xs|sm|lg|xl|2xl|3xl|4xl|5xl)\b|text-\[(?!12\.5px|13\.5px|15px|22px|32px|var)[0-9.]+(px|rem|em)\]/,
  );
  const tamCss = [...css.matchAll(/font-size:\s*([0-9.]+px)/g)].map((m) => m[1]);
  const fuera = tamCss.filter((t) => !["10px", "12.5px", "13.5px", "15px", "16px", "22px", "32px"].includes(t));
  assert.deepEqual([...malos, ...fuera], []);
});

test("ninguna transición ni animación escribe ms a mano", () => {
  // En el CSS solo los tokens (--dur-*, --shake-*, --entrada-pausa) y el
  // bloque de reducir movimiento llevan números.
  const sinReducir = css.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g, "");
  const enCss = sinReducir
    .split("\n")
    .filter((l) => /^\s*(transition|animation)[a-z-]*:/.test(l) && /\b\d+(\.\d+)?m?s\b/.test(l));
  const enTsx = buscar(tsx(), /\b(duration|delay)-\d+\b|\b(duration|delay)-\[\d+m?s\]/);
  assert.deepEqual([...enCss, ...enTsx], []);
});

test("tres cortes de pantalla: 600, 960 y 1200", () => {
  const anchos = [...css.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)].map((m) => `${m[1]}-${m[2]}`);
  const validos = new Set(["max-600", "min-601", "max-960", "min-961", "max-1199", "min-1200"]);
  const enCss = anchos.filter((a) => !validos.has(a));
  const enTsx = buscar(tsx(), /matchMedia\(\s*["'`]\((min|max)-width/).filter((l) => !l.includes("lib/cortes.ts"));
  const variantes = buscar(tsx(), /\b(md|2xl):|\b(min|max)-\[\d+px\]:/);
  assert.deepEqual([...enCss, ...enTsx, ...variantes], []);
});

test("capas con nombre: z-index solo con --z-* o un entero de -1 a 9", () => {
  const enCss = css
    .split("\n")
    .filter((l) => /z-index:\s*-?\d{2,}/.test(l));
  const enTsx = buscar(tsx(), /\bz-(\d{2,}|\[\d{2,}\])/);
  assert.deepEqual([...enCss, ...enTsx], []);
});
