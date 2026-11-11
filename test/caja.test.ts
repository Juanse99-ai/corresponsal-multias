// Pruebas de la clave de caja (lib/caja.ts). Se corren con `npm test` (Node 22).
// Cifrar, verificar y bloquear viven en Postgres (corr_caja_verificar) y se
// probaron contra la base: aquí van las reglas que quedan en el servidor de Next.
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorClaveNueva, hashToken, mensajeVerificacion, minutosRestantes, tokenEquipo } from "../lib/caja.ts";

test("la clave son 6 números", () => {
  assert.equal(errorClaveNueva("48291"), "La clave son 6 números.");
  assert.equal(errorClaveNueva("4829137"), "La clave son 6 números.");
  assert.equal(errorClaveNueva("48a913"), "La clave son 6 números.");
  assert.equal(errorClaveNueva("482913"), null);
});

test("las claves obvias no sirven", () => {
  assert.match(errorClaveNueva("000000") ?? "", /iguales/);
  assert.match(errorClaveNueva("777777") ?? "", /iguales/);
  assert.match(errorClaveNueva("123456") ?? "", /seguidos/);
  assert.match(errorClaveNueva("654321") ?? "", /seguidos/);
  assert.match(errorClaveNueva("890123") ?? "", /seguidos/);
  assert.match(errorClaveNueva("121212") ?? "", /patrón/);
  assert.match(errorClaveNueva("123123") ?? "", /patrón/);
  assert.match(errorClaveNueva("112233") ?? "", /patrón/);
  assert.equal(errorClaveNueva("482913"), null);
  assert.equal(errorClaveNueva("905174"), null);
});

test("minutos restantes de un bloqueo", () => {
  const ahora = new Date("2026-11-11T12:00:00Z");
  assert.equal(minutosRestantes(null, ahora), 0);
  assert.equal(minutosRestantes("2026-11-11T11:59:00Z", ahora), 0);
  assert.equal(minutosRestantes("2026-11-11T12:00:30Z", ahora), 1);
  assert.equal(minutosRestantes("2026-11-11T12:05:00Z", ahora), 5);
});

test("lo que contesta la base, en palabras", () => {
  const ahora = new Date("2026-11-11T12:00:00Z");
  assert.equal(mensajeVerificacion({ ok: true }, ahora), null);
  assert.equal(mensajeVerificacion({ ok: false, motivo: "mala", quedan: 3 }, ahora), "Clave mala. Quedan 3 intentos.");
  assert.equal(mensajeVerificacion({ ok: false, motivo: "mala", quedan: 1 }, ahora), "Clave mala. Queda 1 intento.");
  assert.equal(
    mensajeVerificacion({ ok: false, motivo: "mala", quedan: 0, hasta: "2026-11-11T12:05:00Z" }, ahora),
    "Clave mala. Bloqueada 5 min.",
  );
  assert.equal(
    mensajeVerificacion({ ok: false, motivo: "bloqueada", hasta: "2026-11-11T12:10:00Z" }, ahora),
    "Bloqueada. Intenta en 10 min.",
  );
  assert.equal(mensajeVerificacion({ ok: false, motivo: "equipo" }, ahora), "Este equipo no está autorizado.");
  assert.match(mensajeVerificacion({ ok: false, motivo: "bloqueada_siempre" }, ahora) ?? "", /administrador/);
  assert.equal(
    mensajeVerificacion({ ok: false, motivo: "actual_mala", quedan: 2 }, ahora),
    "Clave actual mala. Quedan 2 intentos.",
  );
});

test("el token del equipo y su hash", () => {
  const { token, hash } = tokenEquipo();
  assert.ok(token.length >= 40);
  assert.equal(hash, hashToken(token));
  assert.notEqual(tokenEquipo().token, token);
});
