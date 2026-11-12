// Pruebas de los textos de los avisos por WhatsApp (lib/avisos-texto.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mensajeCierre, textoCierre, textoPendientes } from "../lib/avisos-texto.ts";

const APP = "https://corresponsal-multias.vercel.app";

test("sin pendientes no hay texto, así OpenClaw no manda nada", () => {
  assert.equal(textoPendientes([]), "");
});

test("una foto por revisar dice qué es, cuánto, por qué y a dónde ir", () => {
  const t = textoPendientes([{ tipo: "comprobante", fecha: "2026-11-12", monto: 635_000, motivo: "No se leyó la hora" }]);
  assert.equal(t, `*1 foto por revisar*\n- Comprobante de $635.000: No se leyó la hora\n${APP}/luis?fecha=2026-11-12`);
});

test("varias fotos de varios días van agrupadas por día", () => {
  const t = textoPendientes([
    { tipo: "compensacion", fecha: "2026-11-12", monto: 21_800_002, motivo: "Confírmala" },
    { tipo: "comprobante", fecha: "2026-11-11", monto: null, motivo: null },
  ]);
  assert.match(t, /^\*2 fotos por revisar\*\n/);
  assert.ok(t.indexOf("11 nov 2026") < t.indexOf("12 nov 2026"));
  // "Confírmala" no aporta: no se repite.
  assert.match(t, /- Compensación del Sr\. Luis de \$21\.800\.002\n/);
  assert.match(t, /- Comprobante\n/);
  assert.match(t, /luis\?fecha=2026-11-11/);
});

test("el recordatorio de cierre solo habla si hay algo que hacer", () => {
  assert.equal(mensajeCierre({ estado: "cerrado", saldo_final: 0 }), null);
  assert.equal(textoCierre({ estado: "cerrado", saldo_final: 0 }, "2026-11-12"), "");
  assert.equal(mensajeCierre(null)?.title, "Cierra el cuadre de hoy");
  assert.match(mensajeCierre({ estado: "abierto", saldo_final: 50_000 })!.body, /descuadre de \$50\.000/);
  assert.match(mensajeCierre({ estado: "cerrado", saldo_final: -20_000 })!.body, /sobrante de \$20\.000/);
  assert.match(mensajeCierre({ estado: "cerrado", saldo_final: 20_000 })!.body, /faltante de \$20\.000/);
  assert.equal(
    textoCierre({ estado: "abierto", saldo_final: 0 }, "2026-11-12"),
    `*Cierra el cuadre de hoy*\nEl día sigue abierto. Cuando tengas la tirilla, cuádralo y ciérralo.\n${APP}/cuadre?fecha=2026-11-12`,
  );
});
