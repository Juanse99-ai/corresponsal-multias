// Refracción del vidrio de la barra de abajo (Liquid Glass de iOS 26): el
// borde de la cápsula desvía lo que está detrás, como una lente. Se hace con
// un filtro SVG (feDisplacementMap) aplicado al fondo con
// `backdrop-filter: url(#...)`. Solo Chromium lo dibuja; Safari y Firefox se
// quedan con el vidrio esmerilado (blur + brillo), que es el respaldo en CSS.

/**
 * Mapa de desplazamiento de una cápsula de `w` × `h` con esquina `r`. Rojo
 * mueve en x y azul en y; el gris del centro (128) no mueve nada, así que
 * solo refracta una franja de `borde` px pegada a la orilla.
 */
export function mapaRefraccion(w: number, h: number, r: number, borde: number): string {
  const b = Math.max(1, Math.min(borde, Math.min(w, h) / 2 - 1));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>` +
    `<linearGradient id="x" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>` +
    `<linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient>` +
    `<filter id="d"><feGaussianBlur stdDeviation="${(b / 2.2).toFixed(1)}"/></filter>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="#000"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#x)"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#y)" style="mix-blend-mode:difference"/>` +
    `<rect x="${b}" y="${b}" width="${w - 2 * b}" height="${h - 2 * b}" rx="${Math.max(0, r - b)}" fill="#808080" filter="url(#d)"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** True en navegadores que dibujan `backdrop-filter: url(#filtro)` (Chromium). */
export function refraccionDisponible(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  return !!ua?.brands?.some((b) => b.brand === "Chromium");
}

// ===== Transparencia del vidrio (la elige cada quien en la hoja Tú) =====
// De 0 (casi sólido) a 100 (casi sin vidrio). Cambia --vidrio-t en <html>:
// globals.css saca de ahí el blanco del vidrio y cuánto desenfoca. Se guarda
// en este teléfono (localStorage); no viaja a otros.

const CLAVE_VIDRIO = "corr-vidrio";
/** La transparencia de fábrica: da el blanco .55 y el desenfoque de 8 px del taller. */
export const VIDRIO_INICIAL = 45;
const oyentesVidrio = new Set<() => void>();

const acotar = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function leerVidrio(): number {
  try {
    const v = localStorage.getItem(CLAVE_VIDRIO);
    const n = Number(v);
    return v === null || !Number.isFinite(n) ? VIDRIO_INICIAL : acotar(n);
  } catch {
    return VIDRIO_INICIAL;
  }
}

/** Pone el valor en <html> (sin guardarlo). */
export function aplicarVidrio(valor: number) {
  document.documentElement.style.setProperty("--vidrio-t", String(acotar(valor) / 100));
}

/** Lo aplica, lo guarda en este teléfono y avisa a quien lo muestre. */
export function guardarVidrio(valor: number) {
  aplicarVidrio(valor);
  try {
    localStorage.setItem(CLAVE_VIDRIO, String(acotar(valor)));
  } catch {
    /* sin localStorage vale solo mientras esté abierta */
  }
  oyentesVidrio.forEach((f) => f());
}

export function suscribirVidrio(f: () => void) {
  oyentesVidrio.add(f);
  return () => {
    oyentesVidrio.delete(f);
  };
}
