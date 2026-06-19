// Control general del corresponsal (snapshot diario). Logica pura.
// El saldo de Luis (su liquidez) esta REPARTIDO en: cupo disponible + efectivo +
// nequis + monedas + lo prestado a terceros (plata de Luis que esta afuera por cobrar).
// Todo eso debe cuadrar con el saldo de Luis, por eso las deudas de terceros RESTAN.
// SALDO TOTAL = (saldo_luis + saldo_cristian) - (cupo + efectivo + nequis + monedas + deudas_terceros)  -> debe ser ~0

export interface GeneralValores {
  saldo_luis: number;
  saldo_cristian: number;
  cupo_disponible: number;
  efectivo: number;
  nequis: number;
  monedas: number;
  deudas_terceros: number;
}

export function computeSaldoTotal(v: GeneralValores): number {
  return (
    v.saldo_luis +
    v.saldo_cristian -
    (v.cupo_disponible + v.efectivo + v.nequis + v.monedas + v.deudas_terceros)
  );
}
