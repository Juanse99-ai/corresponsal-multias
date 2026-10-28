// Pruebas de las reglas de acceso. Se corren con `npm test` (Node 22).
import { test } from "node:test";
import assert from "node:assert/strict";
import { aCorreo, errorClaveNueva } from "../lib/clave.ts";

test("el usuario corto se vuelve correo del corresponsal", () => {
  assert.equal(aCorreo("  Ivana "), "ivana@multias.co");
});

test("el correo completo se deja igual, en minúscula", () => {
  assert.equal(aCorreo("Persona.Ejemplo@Correo.com"), "persona.ejemplo@correo.com");
});

test("sin nada escrito no inventa correo", () => {
  assert.equal(aCorreo("   "), "");
});

test("la clave nueva pide largo mínimo y que coincidan", () => {
  assert.match(errorClaveNueva("corta", "corta") ?? "", /al menos 8/);
  assert.equal(errorClaveNueva("una-clave-larga", "otra-clave-larga"), "Las dos claves no coinciden.");
  assert.equal(errorClaveNueva("una-clave-larga", "una-clave-larga"), null);
});
