// Pruebas del texto del resumen de las 7 a.m. (lib/resumen-diario.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { textoResumen, type DatosResumen } from "../lib/resumen-diario.ts";

const base: DatosResumen = {
  hoy: "2026-11-12",
  ayer: "2026-11-11",
  cuadreAyer: { estado: "cerrado", saldoFinal: 0 },
  luis: { consignaciones: 27, totalConsignaciones: 23377000, totalCompensaciones: 2020000, saldo: 10237212 },
  fotosPorRevisar: 0,
  prestamos: { personas: 3, total: 1250000 },
  taller: {
    abiertas: { "Esperando Repuestos": 2, "En Diagnostico": 1, Pendiente: 1 },
    porCobrar: { cantidad: 4, total: 1830000 },
  },
};

test("un día normal", () => {
  assert.equal(
    textoResumen(base),
    [
      "*Resumen del jueves 12 nov*",
      "",
      "*Corresponsal, miércoles 11 nov*",
      "Cuadre: cerrado y cuadrado",
      "Sr. Luis: 27 consignaciones por $23.377.000, compensación $2.020.000",
      "Saldo a favor de Luis: $10.237.212",
      "Préstamos por cobrar: $1.250.000 (3 personas)",
      "",
      "*Taller*",
      "En el taller: 4 (2 esperando repuestos, 1 en diagnóstico, 1 pendiente)",
      "Por cobrar: 4 OT completadas, $1.830.000",
    ].join("\n"),
  );
});

test("cuadre con faltante, sobrante, abierto o sin abrir", () => {
  const con = (c: DatosResumen["cuadreAyer"]) => textoResumen({ ...base, cuadreAyer: c }).split("\n")[3];
  assert.equal(con({ estado: "cerrado", saldoFinal: 28900 }), "Cuadre: cerrado con faltante de $28.900");
  assert.equal(con({ estado: "cerrado", saldoFinal: -5000 }), "Cuadre: cerrado con sobrante de $5.000");
  assert.equal(con({ estado: "abierto", saldoFinal: 0 }), "Cuadre: sigue abierto");
  assert.equal(con({ estado: "abierto", saldoFinal: 12000 }), "Cuadre: sigue abierto, con descuadre de $12.000");
  assert.equal(con(null), "Cuadre: no se abrió");
});

test("lo que está en cero no se dice; lo pendiente sí", () => {
  const t = textoResumen({
    ...base,
    luis: { consignaciones: 1, totalConsignaciones: 200000, totalCompensaciones: 0, saldo: -50000 },
    fotosPorRevisar: 2,
    prestamos: { personas: 0, total: 0 },
    taller: { abiertas: {}, porCobrar: { cantidad: 0, total: 0 } },
  });
  assert.match(t, /Sr\. Luis: 1 consignación por \$200\.000\n/);
  assert.match(t, /Saldo a favor del punto: \$50\.000/);
  assert.match(t, /Por revisar: 2 fotos de comprobantes en Sr\. Luis/);
  assert.doesNotMatch(t, /Préstamos/);
  assert.match(t, /En el taller: ninguno$/);
});

test("sin datos del taller se omite esa parte", () => {
  const t = textoResumen({ ...base, taller: null });
  assert.doesNotMatch(t, /Taller/);
});
