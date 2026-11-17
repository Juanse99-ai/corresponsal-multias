// Pruebas de la decisión de los comprobantes que llegan solos (lib/comprobante-auto.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirComprobante, notaDeLectura, yaRegistradaIgual, type LecturaTirilla } from "../lib/comprobante-auto.ts";

const DIA = "2026-11-10";
const LIBRE = { diaCerrado: false, yaRegistrada: false };
const buena: LecturaTirilla = {
  es_comprobante: true,
  monto: 256000,
  fecha: "2026-11-10",
  hora: "15:12",
  transaccion: "Recarga Nequi",
  titular: "GINA CASTRO",
  seguro: true,
};

test("una tirilla segura del día se guarda sola", () => {
  assert.deepEqual(decidirComprobante(buena, DIA, LIBRE), {
    accion: "guardar",
    fila: { fecha: "2026-11-10", monto: 256000, hora: "15:12", nota: "Recarga Nequi, GINA CASTRO" },
  });
});

test("la hora con segundos se guarda en HH:MM", () => {
  const d = decidirComprobante({ ...buena, hora: "15:12:47" }, DIA, LIBRE);
  assert.equal(d.accion === "guardar" && d.fila.hora, "15:12");
});

test("la de ayer subida hoy se guarda en su día", () => {
  const d = decidirComprobante({ ...buena, fecha: "2026-11-09" }, DIA, LIBRE);
  assert.equal(d.accion === "guardar" && d.fila.fecha, "2026-11-09");
});

test("el año mal leído va a revisión, en el día del mensaje", () => {
  assert.deepEqual(decidirComprobante({ ...buena, fecha: "2020-11-10" }, DIA, LIBRE), {
    accion: "revisar",
    motivo: "La tirilla dice 2020-11-10",
    fecha: "2026-11-10",
  });
});

test("lo dudoso va a revisión", () => {
  assert.equal(decidirComprobante({ ...buena, seguro: false }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, monto: null }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, monto: 0 }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, monto: 1500.5 }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, hora: null }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, hora: "3:12 pm" }, DIA, LIBRE).accion, "revisar");
  assert.equal(decidirComprobante({ ...buena, es_comprobante: false }, DIA, LIBRE).accion, "revisar");
});

test("día cerrado o una igual ya registrada va a revisión", () => {
  assert.deepEqual(decidirComprobante(buena, DIA, { diaCerrado: true, yaRegistrada: false }), {
    accion: "revisar",
    motivo: "El día ya está cerrado",
    fecha: DIA,
  });
  assert.deepEqual(decidirComprobante(buena, DIA, { diaCerrado: false, yaRegistrada: true }), {
    accion: "revisar",
    motivo: "Ya hay una igual registrada",
    fecha: DIA,
  });
});

test("sin titular ni tipo la nota queda vacía", () => {
  const d = decidirComprobante({ ...buena, transaccion: null, titular: null }, DIA, LIBRE);
  assert.equal(d.accion === "guardar" && d.fila.nota, null);
});

test("la nota guarda el número de recibo", () => {
  assert.equal(notaDeLectura({ transaccion: "Consignación", titular: "ANA", recibo: "No. 004512" }), "Consignación, ANA, recibo 004512");
  assert.equal(notaDeLectura({ transaccion: "Consignación", titular: "ANA", recibo: null }), "Consignación, ANA");
});

test("dos consignaciones iguales en el mismo minuto no son la misma si el recibo cambia", () => {
  const otra = [{ hora: "10:55:00", nota: "Consignación, ANA, recibo 111" }];
  // Mismo monto y minuto, recibo distinto: es otra transacción.
  assert.equal(yaRegistradaIgual({ hora: "10:55", recibo: "222" }, otra), false);
  // Mismo recibo: es la misma tirilla, aunque la hora se haya leído distinta.
  assert.equal(yaRegistradaIgual({ hora: "10:57", recibo: "111" }, otra), true);
  // Sin recibo legible: como antes, por la hora.
  assert.equal(yaRegistradaIgual({ hora: "10:55", recibo: null }, otra), true);
  assert.equal(yaRegistradaIgual({ hora: "10:56", recibo: null }, otra), false);
  // Consignaciones de antes (sin recibo en la nota): por la hora.
  const vieja = [{ hora: "10:55:00", nota: "Consignación, ANA" }];
  assert.equal(yaRegistradaIgual({ hora: "10:55", recibo: "222" }, vieja), true);
  assert.equal(yaRegistradaIgual({ hora: "10:57", recibo: "222" }, vieja), false);
});
