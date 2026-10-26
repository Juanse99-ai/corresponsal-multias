// Pruebas de las pestañas del computador. Se corren con `npm test` (Node 22).
import { test } from "node:test";
import assert from "node:assert/strict";
import { esMensajeVentana, esRutaInterna, leerGuardadas, MAX_PESTANAS, tituloDe } from "../lib/ventanas.ts";

const nombres: Record<string, string> = { "/cuadre": "Cuadre", "/prestamos": "Préstamos" };
const nombreDe = (p: string) => nombres[p];

test("el título lleva la sección y, si es otro día, la fecha corta", () => {
  assert.equal(tituloDe("/cuadre", nombreDe), "Cuadre");
  assert.equal(tituloDe("/cuadre?fecha=2026-10-25", nombreDe), "Cuadre 25/10");
  assert.equal(tituloDe("/prestamos?fecha=mal", nombreDe), "Préstamos");
  assert.equal(tituloDe("/otra", nombreDe), "Corresponsal");
});

test("solo se abren rutas de esta app", () => {
  assert.equal(esRutaInterna("/cuadre?fecha=2026-10-25"), true);
  assert.equal(esRutaInterna("//otro.com/x"), false);
  assert.equal(esRutaInterna("/\\otro.com"), false);
  assert.equal(esRutaInterna("https://otro.com"), false);
  assert.equal(esRutaInterna(42), false);
});

test("los mensajes de otros scripts no cuentan", () => {
  assert.equal(esMensajeVentana({ corr: "ventana", tipo: "refrescar" }), true);
  assert.equal(esMensajeVentana({ tipo: "refrescar" }), false);
  assert.equal(esMensajeVentana("ventana"), false);
  assert.equal(esMensajeVentana(null), false);
});

test("lo guardado dañado o ajeno se descarta y no pasa del máximo", () => {
  assert.deepEqual(leerGuardadas(null), []);
  assert.deepEqual(leerGuardadas("{no es json"), []);
  assert.deepEqual(leerGuardadas('{"id":"a"}'), []);
  assert.deepEqual(
    leerGuardadas(JSON.stringify([{ id: "a", href: "/cuadre", extra: 1 }, { id: "b", href: "https://otro.com" }, { href: "/luis" }])),
    [{ id: "a", href: "/cuadre" }],
  );
  const muchas = Array.from({ length: 20 }, (_, i) => ({ id: String(i), href: "/panel" }));
  assert.equal(leerGuardadas(JSON.stringify(muchas)).length, MAX_PESTANAS - 1);
});
