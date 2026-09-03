// Lee la lista que Sr. Luis manda por WhatsApp y saca los movimientos.
// Lógica pura (sin React ni Supabase) para poder probarla sola.
//
// Tolera lo que suele venir en un chat: "$310.000", "310.000", "310,000",
// "1'000.000", "310 mil", "1.5 millones", con o sin hora ("9:33", "09:33 a.m.",
// "21:33"), con viñetas o numeración, y salta las líneas de "total".

export interface MovimientoLeido {
  monto: number;
  /** "HH:MM" en 24h, o null si la línea no traía hora. */
  hora: string | null;
  /** La línea original, para mostrarla en la revisión. */
  texto: string;
}

export interface ResultadoLectura {
  movimientos: MovimientoLeido[];
  /** Líneas que no se entendieron como un movimiento (se muestran, no se guardan). */
  ignoradas: string[];
  total: number;
}

/** Monto mínimo creíble en pesos: evita leer "2" de "2 transferencias". */
const MONTO_MINIMO = 1000;

// Hora con dos puntos ("9:33", "21:38", "9:33 am"). La forma con punto ("9.33")
// SOLO cuenta si trae am/pm: si no, "1.000.000" se leería como la hora 1:00.
// (?!\d) evita que "1.00" se coma el principio de "1.000".
const RE_HORA = /\b(\d{1,2})(?::(\d{2})(?!\d)\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?|\.(\d{2})(?!\d)\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm))\b/i;

function normalizarHora(h: string, m: string, sufijo?: string): string | null {
  let hh = Number(h);
  const mm = Number(m);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  const s = (sufijo ?? "").replace(/[\s.]/g, "").toLowerCase();
  if (s === "pm" && hh < 12) hh += 12;
  if (s === "am" && hh === 12) hh = 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Convierte "1.580.000", "310,000", "1'000.000", "310 mil", "1.5 millones" a entero. */
function leerMonto(fragmento: string): number | null {
  const t = fragmento.toLowerCase();

  // "1.5 millones" / "2 millones" / "1 millón"
  const mill = t.match(/(\d+(?:[.,]\d+)?)\s*(millon|millón|millones)/);
  if (mill) return Math.round(Number(mill[1].replace(",", ".")) * 1_000_000);

  // "310 mil" / "310k"
  const mil = t.match(/(\d+(?:[.,]\d+)?)\s*(mil\b|k\b)/);
  if (mil) return Math.round(Number(mil[1].replace(",", ".")) * 1_000);

  // Número con separadores: toma la corrida numérica más larga de la línea.
  const corridas = t.match(/\d[\d.,']*\d|\d/g);
  if (!corridas) return null;
  const cruda = corridas.reduce((a, b) => (b.replace(/\D/g, "").length > a.replace(/\D/g, "").length ? b : a));

  // Grupos de 3 tras el separador = miles; 1–2 dígitos al final = decimales.
  const partes = cruda.split(/[.,']/);
  let entero: string;
  if (partes.length === 1) {
    entero = partes[0];
  } else {
    const ultimo = partes[partes.length - 1];
    if (ultimo.length === 3) entero = partes.join("");
    else entero = partes.slice(0, -1).join(""); // descarta decimales
  }
  const n = Number(entero);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function leerListaWhatsApp(texto: string): ResultadoLectura {
  const movimientos: MovimientoLeido[] = [];
  const ignoradas: string[] = [];

  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;

    // Líneas de resumen: no son movimientos.
    if (/\b(total|suma|saldo|subtotal)\b/i.test(linea)) {
      ignoradas.push(linea);
      continue;
    }

    // Quitar viñetas y numeración tipo "1) ", "1. ", "-", "•". La numeración
    // exige espacio después: sin eso "1.000.000" y "1.5 millones" perdían el "1.".
    let cuerpo = linea.replace(/^\s*(?:[-*•·]+\s*|\d{1,2}[.)]\s+)/, "");

    let hora: string | null = null;
    const mh = cuerpo.match(RE_HORA);
    if (mh) {
      hora = normalizarHora(mh[1], mh[2] ?? mh[4], mh[3] ?? mh[5]);
      // Solo se quita del texto si de verdad era una hora válida.
      if (hora) cuerpo = cuerpo.replace(mh[0], " ");
    }

    const monto = leerMonto(cuerpo);
    if (monto === null || monto < MONTO_MINIMO) {
      ignoradas.push(linea);
      continue;
    }
    movimientos.push({ monto, hora, texto: linea });
  }

  return {
    movimientos,
    ignoradas,
    total: movimientos.reduce((s, m) => s + m.monto, 0),
  };
}
