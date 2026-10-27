// Pruebas de las pestañas del computador (lib/pestanas.ts). Se corren con `npm test` (Node 22).
// Son las reglas de Biela: el menú cambia la pestaña en la que se está, una
// pantalla nunca se abre dos veces, hasta 6, y al cerrar se vuelve a la que la abrió.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PESTANAS,
  activar,
  cerrar,
  esRutaInterna,
  irA,
  normalizar,
  paraGuardar,
  pestanaActiva,
  pestanasIniciales,
  restaurar,
  tituloDe,
} from "../lib/pestanas.ts";

const hrefs = (e: { lista: { href: string }[] }) => e.lista.map((p) => p.href);
const HOY = "2026-10-27";

test("la fecha de hoy no cuenta y lo demás de la búsqueda se va", () => {
  assert.equal(normalizar("/cuadre", HOY), "/cuadre");
  assert.equal(normalizar(`/cuadre?fecha=${HOY}`, HOY), "/cuadre");
  assert.equal(normalizar("/cuadre?fecha=2026-10-25&x=1", HOY), "/cuadre?fecha=2026-10-25");
  assert.equal(normalizar("/luis?fecha=mal", HOY), "/luis");
});

test("el título lleva la sección y, si es otro día, la fecha corta", () => {
  const nombres: Record<string, string> = { "/cuadre": "Cuadre" };
  const nombreDe = (p: string) => nombres[p];
  assert.equal(tituloDe("/cuadre", nombreDe), "Cuadre");
  assert.equal(tituloDe("/cuadre?fecha=2026-10-25", nombreDe), "Cuadre 25/10");
  assert.equal(tituloDe("/otra", nombreDe), "Corresponsal");
});

test("solo se abren rutas de esta app", () => {
  assert.equal(esRutaInterna("/cuadre?fecha=2026-10-25"), true);
  assert.equal(esRutaInterna("//otro.com/x"), false);
  assert.equal(esRutaInterna("/\\otro.com"), false);
  assert.equal(esRutaInterna("https://otro.com"), false);
});

test("el menú cambia la pestaña en la que se está y conserva su id", () => {
  const e = pestanasIniciales("/panel");
  const r = irA(e, "/cuadre");
  assert.deepEqual(hrefs(r.estado), ["/cuadre"]);
  assert.equal(r.id, "p1");
});

test("si la pantalla ya está abierta, salta a ella sin duplicarla", () => {
  let e = irA(pestanasIniciales("/panel"), "/cuadre", { aparte: true }).estado;
  e = activar(e, "p1");
  const r = irA(e, "/cuadre");
  assert.deepEqual(hrefs(r.estado), ["/panel", "/cuadre"]);
  assert.equal(pestanaActiva(r.estado).href, "/cuadre");
});

test("Cuadre de hoy y Cuadre de otro día son dos pestañas", () => {
  const e = irA(pestanasIniciales("/cuadre"), "/cuadre?fecha=2026-10-25", { aparte: true }).estado;
  assert.deepEqual(hrefs(e), ["/cuadre", "/cuadre?fecha=2026-10-25"]);
});

test("con algo sin guardar, la pantalla abre al lado y no pisa la de adelante", () => {
  const r = irA(pestanasIniciales("/cuadre"), "/luis", { sucia: true });
  assert.deepEqual(hrefs(r.estado), ["/cuadre", "/luis"]);
  assert.equal(pestanaActiva(r.estado).href, "/luis");
});

test("Ctrl + clic abre detrás: la de adelante no cambia", () => {
  const r = irA(pestanasIniciales("/panel"), "/prestamos", { fondo: true });
  assert.deepEqual(hrefs(r.estado), ["/panel", "/prestamos"]);
  assert.equal(pestanaActiva(r.estado).href, "/panel");
});

test("la nueva va a la derecha de la de adelante", () => {
  let e = irA(pestanasIniciales("/panel"), "/cuadre", { aparte: true }).estado;
  e = irA(e, "/luis", { aparte: true }).estado;
  e = activar(e, "p1");
  e = irA(e, "/prestamos", { aparte: true }).estado;
  assert.deepEqual(hrefs(e), ["/panel", "/prestamos", "/cuadre", "/luis"]);
});

test(`no pasa de ${MAX_PESTANAS}`, () => {
  let e = pestanasIniciales("/panel");
  for (const h of ["/cuadre", "/luis", "/prestamos", "/movimientos", "/auditoria"]) e = irA(e, h, { aparte: true }).estado;
  assert.equal(e.lista.length, MAX_PESTANAS);
  const r = irA(e, "/general", { aparte: true });
  assert.equal(r.lleno, true);
  assert.equal(r.estado, e);
  // Sin abrir otra, el menú sí puede cambiar la de adelante.
  assert.equal(irA(e, "/general").estado.lista.length, MAX_PESTANAS);
});

test("al cerrar la de adelante se vuelve a la que la abrió", () => {
  let e = irA(pestanasIniciales("/panel"), "/cuadre", { aparte: true }).estado;
  e = irA(e, "/luis", { aparte: true }).estado; // abierta desde /cuadre
  e = activar(e, "p1");
  e = irA(e, "/prestamos", { aparte: true }).estado; // desde /panel, queda en el medio
  e = activar(e, e.lista.find((p) => p.href === "/luis")!.id);
  e = cerrar(e, pestanaActiva(e).id);
  assert.equal(pestanaActiva(e).href, "/cuadre");
});

test("si la que la abrió ya no está, queda la de su lugar o la de su izquierda", () => {
  let e = irA(pestanasIniciales("/panel"), "/cuadre", { aparte: true }).estado;
  e = irA(e, "/luis", { aparte: true }).estado;
  e = cerrar(e, "p2"); // /cuadre, de donde salió /luis
  e = cerrar(e, pestanaActiva(e).id);
  assert.equal(pestanaActiva(e).href, "/panel");
});

test("la última no se cierra", () => {
  const e = pestanasIniciales("/panel");
  assert.equal(cerrar(e, "p1"), e);
});

test("se guarda y vuelve igual, con la misma adelante", () => {
  let e = irA(pestanasIniciales("/panel"), "/cuadre?fecha=2026-10-25", { aparte: true }).estado;
  e = irA(e, "/prestamos", { aparte: true }).estado;
  e = activar(e, "p2");
  const vuelta = restaurar(JSON.parse(JSON.stringify(paraGuardar(e))), () => true)!;
  assert.deepEqual(hrefs(vuelta), hrefs(e));
  assert.equal(pestanaActiva(vuelta).href, "/cuadre?fecha=2026-10-25");
});

test("al restaurar se descarta lo dañado, lo ajeno, lo repetido y lo que el rol no abre", () => {
  const soloOperador = (p: string) => !["/auditoria", "/general"].includes(p);
  const e = restaurar(
    { lista: ["/panel", 3, "//otro.com", "/auditoria", "/panel", "/cuadre"], activa: 3 },
    soloOperador,
  )!;
  assert.deepEqual(hrefs(e), ["/panel", "/cuadre"]);
  assert.equal(e.activa, "p1");
  assert.equal(restaurar(null, () => true), null);
  assert.equal(restaurar({ lista: "x" }, () => true), null);
  assert.equal(restaurar({ lista: ["/auditoria"], activa: 0 }, soloOperador), null);
});

test("al restaurar no pasa del tope", () => {
  const lista = ["/a", "/b", "/c", "/d", "/e", "/f", "/g", "/h"];
  assert.equal(restaurar({ lista, activa: 0 }, () => true)!.lista.length, MAX_PESTANAS);
});
