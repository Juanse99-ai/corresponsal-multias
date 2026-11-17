// Pruebas del latido del puente (lib/latido.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirLatido } from "../lib/latido.ts";

const AHORA = Date.parse("2026-11-17T15:00:00Z"); // 10:00 en Bogotá
const hace = (min: number) => new Date(AHORA - min * 60_000).toISOString();

test("con latido reciente no pasa nada", () => {
  assert.equal(decidirLatido(hace(4), "", AHORA, 10), "nada");
});

test("sin latido por más de 15 minutos en horario se avisa una sola vez", () => {
  const ultimo = hace(20);
  assert.equal(decidirLatido(ultimo, "", AHORA, 10), "avisar_caido");
  // Ya se avisó sobre ese mismo latido: no se repite cada 5 minutos.
  assert.equal(decidirLatido(ultimo, ultimo, AHORA, 10), "nada");
});

test("fuera de horario no se avisa la caída", () => {
  assert.equal(decidirLatido(hace(60), "", AHORA, 22), "nada");
  assert.equal(decidirLatido(hace(60), "", AHORA, 6), "nada");
  // A las 7 sigue caído: ahí sí.
  assert.equal(decidirLatido(hace(600), "", AHORA, 7), "avisar_caido");
});

test("cuando vuelve después de un aviso, se avisa que volvió", () => {
  assert.equal(decidirLatido(hace(2), hace(30), AHORA, 10), "avisar_volvio");
  assert.equal(decidirLatido(hace(2), hace(30), AHORA, 23), "avisar_volvio");
});

test("si el puente nunca ha mandado latido, no se avisa", () => {
  assert.equal(decidirLatido(null, "", AHORA, 10), "nada");
});
