// Control general del corresponsal (snapshot diario). Logica pura.
// SALDO TOTAL = (saldo_luis + saldo_cristian) - (cupo + efectivo + nequis + monedas + deudas_terceros)

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
