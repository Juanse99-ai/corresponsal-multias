// Pruebas de las compensaciones del Sr. Luis que llegan solas (lib/compensacion.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  palosEnPesos,
  toleranciaDe,
  notaDePago,
  decidirCompensacion,
  noEsCompensacion,
  pendienteQueNoEs,
  textoDeLuis,
  type PagoLeido,
} from "../lib/compensacion.ts";

const DIA = "2026-11-11";
const AUTO = { automatico: true, diaCerrado: false, comprobantesRegistrados: [] as string[] };

const pago = (monto: number, extra: Partial<PagoLeido> = {}): PagoLeido => ({
  formato: "redeban",
  es_compensacion: true,
  monto,
  hora: "10:15",
  referencia: "68883",
  comprobante: `R${monto}`,
  seguro: true,
  ...extra,
});

test("los palos de Luis pasan a pesos", () => {
  assert.equal(palosEnPesos("21.8 palos nuevo"), 21_800_000);
  assert.equal(palosEnPesos("21,8 palos"), 21_800_000);
  assert.equal(palosEnPesos("10 palos nuevo"), 10_000_000);
  assert.equal(palosEnPesos("1 palo"), 1_000_000);
  assert.equal(palosEnPesos("3 Palos"), 3_000_000);
  assert.equal(palosEnPesos("1.25 palos"), 1_250_000);
  assert.equal(palosEnPesos("nuevo"), null);
  assert.equal(palosEnPesos(""), null);
  assert.equal(palosEnPesos(null), null);
});

test("la tolerancia depende de cómo escribió el número, con tope de 100.000", () => {
  assert.equal(toleranciaDe("3 palos"), 100_000);
  assert.equal(toleranciaDe("21.8 palos"), 50_000);
  assert.equal(toleranciaDe("1.25 palos"), 5_000);
});

test("la nota dice de dónde salió y el comprobante", () => {
  assert.equal(notaDePago({ formato: "app", comprobante: "0012345" }), "Compensación app Bancolombia, comprobante 0012345");
  assert.equal(notaDePago({ formato: "cajero", comprobante: null }), "Compensación cajero");
  assert.equal(notaDePago({ formato: null, comprobante: null }), "Compensación foto");
});

test("varios pagos que suman los palos se guardan el día del mensaje con el monto exacto", () => {
  const pagos = [pago(10_000_000), pago(10_000_000), pago(1_800_002, { hora: null })];
  const d = decidirCompensacion(pagos, "21.8 palos nuevo", DIA, "16:40", AUTO);
  assert.equal(d.accion, "guardar");
  assert.equal(d.suma, 21_800_002);
  assert.equal(d.cuadra, true);
  assert.deepEqual(d.filas[2], { fecha: DIA, monto: 1_800_002, hora: "16:40", nota: "Compensación Redeban, comprobante R1800002" });
  // La fecha impresa no manda: todas van el día del mensaje.
  assert.ok(d.filas.every((f) => f.fecha === DIA));
});

test("sin el modo automático todo queda por confirmar, pero se sabe si cuadra", () => {
  const d = decidirCompensacion([pago(3_000_000)], "3 palos nuevo", DIA, null, { ...AUTO, automatico: false });
  assert.equal(d.accion, "revisar");
  assert.equal(d.motivo, "Confírmala");
  assert.equal(d.cuadra, true);
  assert.equal(d.filas.length, 1);
});

test("si la suma no da los palos, se revisa", () => {
  const d = decidirCompensacion([pago(2_400_000)], "2 palos nuevo", DIA, null, AUTO);
  assert.equal(d.accion, "revisar");
  assert.equal(d.motivo, "La suma no da los palos del mensaje");
  assert.equal(d.cuadra, false);
});

test("una foto sin pagos y sin palos no es una compensación", () => {
  // Un pedido con la foto del número, o una foto sin texto que no muestra pagos.
  assert.equal(noEsCompensacion([], "130.000 ese neki Glenni Sady"), true);
  assert.equal(noEsCompensacion([], null), true);
  assert.equal(noEsCompensacion([], ""), true);
  // Dijo palos: quiso mandar una compensación aunque no se haya leído nada.
  assert.equal(noEsCompensacion([], "3 palos nuevo"), false);
  // Se leyó algún pago: se revisa, con o sin palos.
  assert.equal(noEsCompensacion([pago(2_000_000)], ""), false);
  assert.equal(noEsCompensacion([pago(2_000_000, { monto: null })], null), false);
});

test("el encabezado de OpenClaw no es un mensaje de Luis", () => {
  const encabezado = "[WhatsApp 120363000000000000@g.us +24h Thu 2026-11-12 09:27:45 GMT-5] Fulano De Tal (+5990000000):";
  assert.equal(textoDeLuis(encabezado), null);
  assert.equal(textoDeLuis(`${encabezado} 21.8 palos nuevo`), "21.8 palos nuevo");
  assert.equal(textoDeLuis("130.000 ese neki: el de siempre"), "130.000 ese neki: el de siempre");
  assert.equal(textoDeLuis("  3   palos "), "3 palos");
  assert.equal(textoDeLuis(null), null);
});

test("la cola por confirmar se vuelve a pasar por la regla", () => {
  const encabezado = "[WhatsApp 120363000000000000@g.us +24h Thu 2026-11-12 09:27:45 GMT-5] Fulano De Tal (+5990000000):";
  const decision = { accion: "revisar", motivo: "No se leyó ningún pago", filas: [], suma: 0, palos: null, cuadra: false };
  // Las dos que se colaron el 12 nov: un contacto de WhatsApp sin texto y un pedido.
  assert.equal(pendienteQueNoEs({ tipo: "compensacion", texto: encabezado, pagos: [], decision }), true);
  assert.equal(pendienteQueNoEs({ tipo: "compensacion", texto: "130.000 ese neki Glenni Sady", pagos: [], decision }), true);
  // Dijo palos o se leyó algún pago: se queda.
  assert.equal(pendienteQueNoEs({ texto: "3 palos", pagos: [], decision }), false);
  assert.equal(pendienteQueNoEs({ texto: null, pagos: [pago(2_000_000)], decision }), false);
  // La lectura falló o no se hizo: no se sabe qué es, se queda.
  assert.equal(pendienteQueNoEs({ tipo: "compensacion", texto: null, horaMensaje: "09:27" }), false);
  assert.equal(pendienteQueNoEs(null), false);
  assert.equal(pendienteQueNoEs([]), false);
});

test("sin palos en el texto, se revisa", () => {
  const d = decidirCompensacion([pago(2_000_000)], "", DIA, null, AUTO);
  assert.equal(d.motivo, "El mensaje no dice cuántos palos");
  assert.equal(d.palos, null);
});

test("cualquier duda en un pago manda todo a revisar", () => {
  const casos: [PagoLeido[], string][] = [
    [[], "No se leyó ningún pago"],
    [[pago(1_000_000), pago(1_000_000, { monto: null })], "Un pago quedó sin monto"],
    [[pago(2_000_000, { es_compensacion: false })], "Un pago no dice compensación"],
    [[pago(2_000_000, { referencia: "12345" })], "Un pago no lleva la referencia 68883"],
    [[pago(2_000_000, { referencia: null })], "Un pago no lleva la referencia 68883"],
    [[pago(2_000_000, { seguro: false })], "Un dígito quedó dudoso"],
  ];
  for (const [pagos, motivo] of casos) {
    assert.equal(decidirCompensacion(pagos, "2 palos", DIA, null, AUTO).motivo, motivo);
  }
});

test("la referencia puede venir con más números delante", () => {
  const d = decidirCompensacion([pago(2_000_000, { referencia: "0000068883" })], "2 palos", DIA, null, AUTO);
  assert.equal(d.accion, "guardar");
});

test("un comprobante ya registrado o el día cerrado se revisan", () => {
  assert.equal(
    decidirCompensacion([pago(2_000_000)], "2 palos", DIA, null, { ...AUTO, comprobantesRegistrados: ["R2000000"] }).motivo,
    "Un comprobante ya estaba registrado",
  );
  assert.equal(
    decidirCompensacion([pago(2_000_000)], "2 palos", DIA, null, { ...AUTO, diaCerrado: true }).motivo,
    "El día ya está cerrado",
  );
});
