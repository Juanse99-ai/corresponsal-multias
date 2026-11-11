// Pruebas del freno de fechas de las tirillas (lib/fecha-tirilla.ts).
// Caso real: el 10 nov 2026 el lector leyó "2020" en una tirilla de Bancolombia,
// la consignación quedó en 2020 y el arrastre del Sr. Luis bajó $3.000.000.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaDeTirilla, fechasCercanas } from "../lib/fecha-tirilla.ts";

test("sin fecha leída se usa el día que se está cargando", () => {
  assert.deepEqual(fechaDeTirilla(null, "2026-11-10"), { fecha: "2026-11-10", rara: null });
});

test("la fecha del mismo día o de un día de diferencia se respeta", () => {
  assert.deepEqual(fechaDeTirilla("2026-11-10", "2026-11-10"), { fecha: "2026-11-10", rara: null });
  assert.deepEqual(fechaDeTirilla("2026-11-09", "2026-11-10"), { fecha: "2026-11-09", rara: null });
  assert.deepEqual(fechaDeTirilla("2026-11-11", "2026-11-10"), { fecha: "2026-11-11", rara: null });
  // Cambio de mes y de año.
  assert.deepEqual(fechaDeTirilla("2026-10-31", "2026-11-01"), { fecha: "2026-10-31", rara: null });
  assert.deepEqual(fechaDeTirilla("2027-01-01", "2026-12-31"), { fecha: "2027-01-01", rara: null });
});

test("un año mal leído no se guarda: queda en el día y marcada como rara", () => {
  assert.deepEqual(fechaDeTirilla("2020-11-10", "2026-11-10"), { fecha: "2026-11-10", rara: "2020-11-10" });
});

test("dos o más días de diferencia también es rara", () => {
  assert.deepEqual(fechaDeTirilla("2026-11-08", "2026-11-10"), { fecha: "2026-11-10", rara: "2026-11-08" });
  assert.deepEqual(fechaDeTirilla("2026-11-12", "2026-11-10"), { fecha: "2026-11-10", rara: "2026-11-12" });
});

test("una fecha que no existe es rara", () => {
  assert.deepEqual(fechaDeTirilla("2026-02-30", "2026-02-28"), { fecha: "2026-02-28", rara: "2026-02-30" });
  assert.deepEqual(fechaDeTirilla("10/11/2026", "2026-11-10"), { fecha: "2026-11-10", rara: "10/11/2026" });
});

test("fechasCercanas: el servidor rechaza lo que se aleja más de un día", () => {
  assert.equal(fechasCercanas("2026-11-10", "2026-11-10"), true);
  assert.equal(fechasCercanas("2026-11-09", "2026-11-10"), true);
  assert.equal(fechasCercanas("2026-11-08", "2026-11-10"), false);
  assert.equal(fechasCercanas("2020-11-10", "2026-11-10"), false);
});
