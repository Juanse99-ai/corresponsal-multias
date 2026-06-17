// Logica pura del cuadre diario. Compartida por la UI (calculo en vivo) y el servidor.
// Todos los montos son enteros (pesos COP).

export type Rol = "admin" | "operador";
export type EstadoCuadre = "abierto" | "cerrado";

/** Valores que intervienen en la formula del cuadre. */
export interface CuadreValores {
  total_tirilla: number;
  sr_luis: number; // total consignado por Luis ese dia (suma de consignaciones)
  efectivo_consignaciones: number; // consignaciones en efectivo de clientes externos
  retiros_cash: number; // retiros entregados en efectivo (parte del "EFECTIVO" del Excel)
  nequis: number;
  bancolombia: number; // transferencias por Bancolombia (canal electronico)
  prestamos_consignaciones: number;
  ret_real: number; // retiros reales procesados
  compensado: number; // saldo de Luis arrastrado del dia anterior
}

export const CUADRE_VACIO: CuadreValores = {
  total_tirilla: 0,
  sr_luis: 0,
  efectivo_consignaciones: 0,
  retiros_cash: 0,
  nequis: 0,
  bancolombia: 0,
  prestamos_consignaciones: 0,
  ret_real: 0,
  compensado: 0,
};

/**
 * Suma de todo lo que deberia "explicar" la tirilla.
 * Igual que el Excel (CIERRE): SALDO FINAL = TIRILLA - SUMA(SR LUIS .. RET REAL),
 * donde RET REAL tambien se resta (va dentro de la suma).
 * EFECTIVO (Excel) = efectivo_consignaciones + retiros_cash.
 */
export function sumaComponentes(v: CuadreValores): number {
  return (
    v.sr_luis +
    v.efectivo_consignaciones +
    v.retiros_cash +
    v.compensado +
    v.nequis +
    v.bancolombia +
    v.prestamos_consignaciones +
    v.ret_real
  );
}

/**
 * SALDO FINAL = TOTAL TIRILLA - (Sr.Luis + Efectivo + Compensado + Nequis + Prestamos + Ret.Real)
 * Debe ser 0. Distinto de 0 => descuadre (error a revisar).
 */
export function computeSaldoFinal(v: CuadreValores): number {
  return v.total_tirilla - sumaComponentes(v);
}

/** Saldo de Luis de un dia = cupo (compensaciones) - consignaciones. Se acumula. */
export function saldoLuisDia(compensacion: number, consignaciones: number): number {
  return compensacion - consignaciones;
}

/** Hay descuadre si el saldo final no es exactamente cero. */
export function isDescuadre(saldoFinal: number): boolean {
  return Math.round(saldoFinal) !== 0;
}

/** El "EFECTIVO" del Excel, como un solo numero (suma del desglose). */
export function efectivoTotal(v: CuadreValores): number {
  return v.efectivo_consignaciones + v.retiros_cash;
}

/** Efectivo (consig + retiros cash) que debe sumar para que el cuadre de 0. */
export function efectivoParaCuadrar(v: CuadreValores): number {
  return (
    v.total_tirilla -
    v.sr_luis -
    v.compensado -
    v.nequis -
    v.bancolombia -
    v.prestamos_consignaciones -
    v.ret_real
  );
}

export interface ArqueoValores {
  fondo_caja: number;
  efectivo_consignaciones: number; // efectivo que entro
  ret_real: number; // retiros pagados
  compensado: number; // efectivo llevado al banco
  prestamos_consignaciones: number; // prestamos en efectivo
}

/** Efectivo que deberia quedar fisicamente en la caja al cerrar. */
export function efectivoEsperadoCaja(a: ArqueoValores): number {
  return (
    a.fondo_caja +
    a.efectivo_consignaciones -
    a.ret_real -
    a.compensado -
    a.prestamos_consignaciones
  );
}

export interface TermLine {
  key: string;
  label: string;
  value: number;
  sign: 1 | -1;
  hint?: string;
}

/** Desglose firmado de los componentes, para mostrar la formula de forma transparente. */
export function cuadreBreakdown(v: CuadreValores): TermLine[] {
  return [
    { key: "sr_luis", label: "Sr. Luis", value: v.sr_luis, sign: 1, hint: "Consignaciones de Luis del dia" },
    { key: "efectivo_consignaciones", label: "Efectivo (consignaciones)", value: v.efectivo_consignaciones, sign: 1, hint: "Efectivo de clientes externos" },
    { key: "retiros_cash", label: "Retiros en cash", value: v.retiros_cash, sign: 1, hint: "Retiros entregados en efectivo" },
    { key: "compensado", label: "Compensado", value: v.compensado, sign: 1, hint: "Saldo de Luis arrastrado de ayer" },
    { key: "nequis", label: "Nequis", value: v.nequis, sign: 1 },
    { key: "bancolombia", label: "Bancolombia", value: v.bancolombia, sign: 1 },
    { key: "prestamos_consignaciones", label: "Prestamos / consignaciones", value: v.prestamos_consignaciones, sign: 1 },
    { key: "ret_real", label: "Retiros reales", value: v.ret_real, sign: 1, hint: "Parte de la suma" },
  ];
}
