// Pruebas del lector del chat. Se corren con `npm test` (Node 22).
// Los números de ejemplo son inventados: en el repo no va ningún dato real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerListaWhatsApp } from "../lib/luis-parse.ts";

const HOY = "2026-09-22";

test("no lee cédulas, celulares ni cuentas como plata", () => {
  const chat = [
    "[3/9/26, 4:10:32 p. m.] Luis Fernando: PPT: 4815162",
    "[3/9/26, 4:11:02 p. m.] Luis Fernando: el celular es 320 4815162",
    "[3/9/26, 4:12:10 p. m.] Luis Fernando: cuenta 91234567890 ahorros",
  ].join("\n");

  const { movimientos } = leerListaWhatsApp(chat, HOY);
  assert.equal(movimientos.length, 0);
});

test("sí lee los montos como Luis los escribe", () => {
  const chat = [
    "[3/9/26, 4:10:32 p. m.] Luis Fernando: 1'500.000 ese neki Andrea",
    "[3/9/26, 4:13:00 p. m.] Luis Fernando: 635.000 esa cuenta Luifer",
    "[3/9/26, 4:15:00 p. m.] Luis Fernando: 65 mil de recarga",
  ].join("\n");

  const { movimientos, dias } = leerListaWhatsApp(chat, HOY);
  assert.deepEqual(
    movimientos.map((m) => m.monto),
    [1_500_000, 635_000, 65_000],
  );
  assert.equal(dias.length, 1);
  assert.equal(dias[0].total, 2_200_000);
});
