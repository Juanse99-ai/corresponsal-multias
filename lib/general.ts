// Control general del corresponsal (snapshot diario). Logica pura.
// Las deudas DE terceros (lo que Juan, el taller u otros le deben al corresponsal)
// son plata a favor del corresponsal, por eso SUMAN igual que los saldos.
// SALDO TOTAL = (saldo_luis + saldo_cristian + deudas_terceros) - (cupo + efectivo + nequis + monedas)

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
    v.saldo_cristian +
    v.deudas_terceros -
    (v.cupo_disponible + v.efectivo + v.nequis + v.monedas)
  );
}
