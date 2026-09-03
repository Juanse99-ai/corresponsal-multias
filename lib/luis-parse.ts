// Lee lo que Sr. Luis manda por WhatsApp y saca los movimientos.
// Lógica pura (sin React ni Supabase) para poder probarla sola.
//
// Luis manda UN mensaje por movimiento: la foto de la cuenta destino y un
// texto como "1'500.000 ese neki Andrea Michelle SDK". La hora no va en el
// texto: es la del mensaje. Por eso el lector entiende el chat tal como sale
// al copiarlo o exportarlo desde WhatsApp, que trae fecha, hora y remitente:
//
//   [3/9/26, 4:10:32 p. m.] Luis Fernando: 1'500.000 ese neki Andrea   (iPhone)
//   3/9/26, 4:10 p. m. - Luis Fernando: 635.000 ese neki Luifer hijo    (Android)
//   [16:10, 3/9/2026] Luis Fernando: 232.000 esa cuenta Juancho polo    (WhatsApp Web)
//
// También sirve una lista simple ("310.000 9:33", "1.000.000", "310 mil").
// Salta números de cuenta o celular (no son montos), fotos, totales y saludos.

export interface MovimientoLeido {
  monto: number;
  /** "HH:MM" en 24h, o null si no venía hora. */
  hora: string | null;
  /** Fecha ISO del mensaje si venía en el encabezado de WhatsApp. */
  fecha: string | null;
  /** Quién lo escribió, si venía en el encabezado. */
  de: string | null;
  /** Lo que acompaña al monto ("Nequi Andrea Michelle SDK"), ya sin el monto. */
  nota: string | null;
  /** La línea original, para mostrarla en la revisión. */
  texto: string;
}

export interface ResultadoLectura {
  /** Movimientos del día pedido (o todos, si no se pasó fecha). */
  movimientos: MovimientoLeido[];
  /** Movimientos que traían otra fecha en el encabezado: no se guardan. */
  otrosDias: MovimientoLeido[];
  /** Líneas que no se entendieron como un movimiento (se muestran, no se guardan). */
  ignoradas: string[];
  total: number;
}

/** Monto mínimo creíble en pesos: evita leer "2" de "2 transferencias". */
const MONTO_MINIMO = 1000;
/** Por encima de esto no es un monto sino un número de cuenta o celular. */
const MONTO_MAXIMO = 100_000_000;

const SUFIJO = String.raw`(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)(?![a-z])`;
// Hora con dos puntos ("9:33", "21:38", "9:33 am", "4:10:32 p. m."). La forma
// con punto ("9.33") SOLO cuenta si trae am/pm: si no, "1.000.000" se leería
// como la hora 1:00. (?![\d:]) evita que "1.00" se coma el principio de "1.000".
const RE_HORA = new RegExp(
  String.raw`\b(\d{1,2})(?::(\d{2})(?::\d{2})?(?![\d:])\s*(?:${SUFIJO})?|\.(\d{2})(?!\d)\s*${SUFIJO})`,
  "i",
);

const FECHA = String.raw`\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}`;
const HORA_CAB = String.raw`\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?\s*m\.?)?`;
// Encabezado de WhatsApp: "[fecha, hora] Nombre: " o "[hora, fecha] Nombre: "
// o "fecha, hora - Nombre: ". El nombre va hasta el primer ":" tras el encabezado.
const RE_CABECERA = new RegExp(
  String.raw`^\[?\s*(${FECHA}|${HORA_CAB})[,\s]+(${FECHA}|${HORA_CAB})\s*\]?\s*(?:-\s*)?([^:]{1,80}?):\s?(.*)$`,
  "i",
);

// Avisos del propio WhatsApp: fotos, stickers, borrados, cifrado.
const RE_SISTEMA = /\b(omitid[oa]|adjunto|multimedia|sticker|elimin(?:ó|o|ad[oa]|aste)|cifrad[oa]s?)\b/i;
// Líneas de resumen: no son movimientos.
const RE_RESUMEN = /\b(total|suma|saldo|subtotal)\b/i;

function normalizarHora(h: string, m: string, sufijo?: string): string | null {
  let hh = Number(h);
  const mm = Number(m);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  const s = (sufijo ?? "").replace(/[\s.]/g, "").toLowerCase();
  if (s === "pm" && hh < 12) hh += 12;
  if (s === "am" && hh === 12) hh = 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "3/9/26" o "03/09/2026" (día/mes/año, como en Colombia) a ISO. */
function normalizarFecha(txt: string): string | null {
  const m = txt.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (d < 1 || d > 31 || mes < 1 || mes > 12) return null;
  return `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function leerHoraCabecera(txt: string): string | null {
  const m = txt.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s*m\.?)?/i);
  return m ? normalizarHora(m[1], m[2], m[3]) : null;
}

/** Entero de "1.580.000", "310,000", "1'000.000" (grupos de 3 = miles; 1–2 al final = decimales). */
function enteroDe(cruda: string): number | null {
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

/** Convierte "1.580.000", "310,000", "1'000.000", "310 mil", "1.5 millones" a entero. */
function leerMonto(fragmento: string): { monto: number; crudo: string } | null {
  const t = fragmento.toLowerCase();

  // "1.5 millones" / "2 millones" / "1 millón"
  const mill = t.match(/(\d+(?:[.,]\d+)?)\s*(millones|millón|millon)/);
  if (mill) {
    const monto = Math.round(Number(mill[1].replace(",", ".")) * 1_000_000);
    return monto <= MONTO_MAXIMO ? { monto, crudo: mill[0] } : null;
  }

  // "310 mil" / "310k"
  const mil = t.match(/(\d+(?:[.,]\d+)?)\s*(mil\b|k\b)/);
  if (mil) return { monto: Math.round(Number(mil[1].replace(",", ".")) * 1_000), crudo: mil[0] };

  // Número con separadores: la corrida numérica más larga que aún sea un monto.
  // Celulares (3027661514) y cuentas (58454555561) pasan el tope y se descartan.
  const corridas = t.match(/\d[\d.,']*\d|\d/g);
  if (!corridas) return null;
  const candidatas = corridas
    .map((c) => ({ crudo: c, monto: enteroDe(c) }))
    .filter((c): c is { crudo: string; monto: number } => c.monto !== null && c.monto <= MONTO_MAXIMO);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((a, b) => (b.crudo.replace(/\D/g, "").length > a.crudo.replace(/\D/g, "").length ? b : a));
}

/** Lo que queda de la línea sin el monto ni la hora, limpio, para usar de nota. */
function limpiarNota(resto: string): string | null {
  let n = resto
    .replace(/\s+/g, " ")
    .replace(/^[\s$\-–—:,.;]+|[\s\-–—:,.;]+$/g, "")
    // Muletillas al inicio: "ese neki Andrea" -> "neki Andrea".
    .replace(/^(?:(?:ese|esa|eso|a|al|la|el|los|las|para|pa|de|del|en)\s+)+/i, "")
    .replace(/\bnekis?\b/gi, "Nequi")
    .trim();
  if (!n) return null;
  n = n.charAt(0).toUpperCase() + n.slice(1);
  return n.length > 200 ? n.slice(0, 200) : n;
}

/** Quita marcas invisibles de WhatsApp y unifica los espacios raros ("p. m." usa uno estrecho). */
function normalizarTexto(texto: string): string {
  return texto.replace(/[‎‏﻿]/g, "").replace(/[  ]/g, " ");
}

export function leerListaWhatsApp(texto: string, fecha?: string): ResultadoLectura {
  const movimientos: MovimientoLeido[] = [];
  const otrosDias: MovimientoLeido[] = [];
  const ignoradas: string[] = [];

  // Un mensaje de varias líneas trae encabezado solo en la primera: las demás lo heredan.
  let cab: { fecha: string | null; hora: string | null; de: string | null } | null = null;

  for (const cruda of normalizarTexto(texto).split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;

    let cuerpo = linea;
    let hora: string | null = null;
    let fechaMsg: string | null = null;
    let de: string | null = null;

    const mc = linea.match(RE_CABECERA);
    if (mc) {
      const [, p1, p2, nombre, resto] = mc;
      const f = normalizarFecha(p1) ?? normalizarFecha(p2);
      const h = leerHoraCabecera(normalizarFecha(p1) ? p2 : p1);
      cab = { fecha: f, hora: h, de: nombre.trim() };
      cuerpo = resto.trim();
    }
    if (cab) ({ fecha: fechaMsg, hora, de } = cab);
    if (!cuerpo) continue;

    if (RE_SISTEMA.test(cuerpo) || RE_RESUMEN.test(cuerpo)) {
      ignoradas.push(linea);
      continue;
    }

    // Quitar viñetas y numeración tipo "1) ", "1. ", "-", "•". La numeración
    // exige espacio después: sin eso "1.000.000" y "1.5 millones" perdían el "1.".
    cuerpo = cuerpo.replace(/^\s*(?:[-*•·]+\s*|\d{1,2}[.)]\s+)/, "");

    // Hora escrita en el propio texto (lista simple); la del encabezado manda si existe.
    const mh = cuerpo.match(RE_HORA);
    if (mh) {
      const enTexto = normalizarHora(mh[1], mh[2] ?? mh[4], mh[3] ?? mh[5]);
      // Solo se quita del texto si de verdad era una hora válida.
      if (enTexto) {
        cuerpo = cuerpo.replace(mh[0], " ");
        hora ??= enTexto;
      }
    }

    const leido = leerMonto(cuerpo);
    if (!leido || leido.monto < MONTO_MINIMO) {
      ignoradas.push(linea);
      continue;
    }

    const idx = cuerpo.toLowerCase().indexOf(leido.crudo);
    const resto = idx >= 0 ? cuerpo.slice(0, idx) + " " + cuerpo.slice(idx + leido.crudo.length) : cuerpo;
    const mov: MovimientoLeido = { monto: leido.monto, hora, fecha: fechaMsg, de, nota: limpiarNota(resto), texto: linea };

    if (fecha && mov.fecha && mov.fecha !== fecha) otrosDias.push(mov);
    else movimientos.push(mov);
  }

  return {
    movimientos,
    otrosDias,
    ignoradas,
    total: movimientos.reduce((s, m) => s + m.monto, 0),
  };
}
