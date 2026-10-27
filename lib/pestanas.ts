/**
 * Pestañas del computador, como en Biela (src/utils/pestanas.js del taller):
 * varias pantallas abiertas a la vez, cada una donde se dejó. Todas quedan
 * montadas en el mismo árbol de React y solo se ve la de adelante; aquí van
 * solo las reglas, sin React, para probarlas sin navegador
 * (test/pestanas.test.ts). El escritorio (components/shell/pestanas.tsx)
 * guarda el estado y pinta una pantalla por pestaña.
 *
 * Una pestaña es { id, href, desde? }:
 *   href   la pantalla, con su ?fecha= si es de otro día ("/cuadre?fecha=2026-10-25").
 *   desde  la pestaña desde la que se abrió: al cerrarla se vuelve a ella.
 *
 * Dos pestañas no muestran la misma pantalla: la clave es la ruta más la fecha,
 * así "Cuadre de hoy" y "Cuadre 25/10" son dos pestañas distintas.
 */

export const MAX_PESTANAS = 6;

export interface Pestana {
  id: string;
  href: string;
  desde?: string;
}

export interface EstadoPestanas {
  lista: Pestana[];
  activa: string;
  seq: number;
}

export interface Resultado {
  estado: EstadoPestanas;
  id?: string;
  /** Ya hay MAX_PESTANAS: no se abrió nada. */
  lleno?: boolean;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Solo rutas de esta app: nada de otro dominio, ni "//otro.com" ni "/\\otro.com"
 *  (el navegador lee las dos como otro sitio). */
export function esRutaInterna(href: unknown): href is string {
  return typeof href === "string" && /^\/(?![\\/])/.test(href);
}

/**
 * La pantalla como se guarda: la ruta y, si es de otro día, su ?fecha=. La
 * fecha de hoy se quita, para que "/cuadre" y "/cuadre?fecha=<hoy>" sean la
 * misma pestaña. Lo demás de la búsqueda era de una vez y no cuenta.
 */
export function normalizar(href: string, hoy: string): string {
  const url = new URL(href, "http://x");
  const fecha = url.searchParams.get("fecha");
  return fecha && FECHA.test(fecha) && fecha !== hoy ? `${url.pathname}?fecha=${fecha}` : url.pathname;
}

export const rutaDe = (href: string) => new URL(href, "http://x").pathname;

/** "Cuadre", o "Cuadre 25/10" si la pantalla es de otro día. */
export function tituloDe(href: string, nombreDe: (pathname: string) => string | undefined): string {
  const url = new URL(href, "http://x");
  const nombre = nombreDe(url.pathname) ?? "Corresponsal";
  const fecha = url.searchParams.get("fecha")?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return fecha ? `${nombre} ${fecha[2]}/${fecha[1]}` : nombre;
}

export function pestanasIniciales(href: string): EstadoPestanas {
  return { lista: [{ id: "p1", href }], activa: "p1", seq: 1 };
}

export const pestanaActiva = (estado: EstadoPestanas): Pestana =>
  estado.lista.find((p) => p.id === estado.activa) ?? estado.lista[0];

export function activar(estado: EstadoPestanas, id: string): EstadoPestanas {
  if (estado.activa === id || !estado.lista.some((p) => p.id === id)) return estado;
  return { ...estado, activa: id };
}

function nueva(estado: EstadoPestanas, href: string, desde?: string) {
  const seq = estado.seq + 1;
  return { seq, pestana: { id: `p${seq}`, href, ...(desde ? { desde } : {}) } };
}

/**
 * El menú, el + o un enlace piden una pantalla (ya normalizada).
 *   fondo   Ctrl + clic o la rueda: abre detrás, sin cambiar de pestaña.
 *   aparte  el + de la tira: en otra pestaña, y esa queda adelante.
 *   sucia   la de adelante tiene algo sin guardar: no se pisa, se abre al lado.
 * Si la pantalla ya está abierta se salta a ella. Si no, la nueva toma el
 * lugar de la de adelante, como un enlace en el navegador.
 */
export function irA(
  estado: EstadoPestanas,
  href: string,
  { fondo = false, aparte = false, sucia = false }: { fondo?: boolean; aparte?: boolean; sucia?: boolean } = {},
): Resultado {
  const ya = estado.lista.find((p) => p.href === href);
  if (ya) return { estado: fondo ? estado : activar(estado, ya.id), id: ya.id };
  const actual = pestanaActiva(estado);
  if (fondo || aparte || sucia) {
    // A la derecha de la de adelante, como en el navegador.
    if (estado.lista.length >= MAX_PESTANAS) return { estado, lleno: true };
    const { seq, pestana } = nueva(estado, href, actual.id);
    const lista = [...estado.lista];
    lista.splice(lista.indexOf(actual) + 1, 0, pestana);
    return { estado: { lista, seq, activa: fondo ? estado.activa : pestana.id }, id: pestana.id };
  }
  // Misma pestaña, otra pantalla: conserva su id (y su lugar en la tira).
  const lista = estado.lista.map((p) => (p === actual ? { ...p, href } : p));
  return { estado: { ...estado, lista }, id: actual.id };
}

/**
 * Cerrar: la última no se cierra. Si la cerrada era la de adelante, se vuelve
 * a la que la abrió; si esa ya no está, a la que queda en su lugar (o la de su
 * izquierda).
 */
export function cerrar(estado: EstadoPestanas, id: string): EstadoPestanas {
  const i = estado.lista.findIndex((p) => p.id === id);
  if (i < 0 || estado.lista.length === 1) return estado;
  const cerrada = estado.lista[i];
  const lista = estado.lista.filter((p) => p.id !== id);
  if (estado.activa !== id) return { ...estado, lista };
  const vuelta = lista.find((p) => p.id === cerrada.desde) ?? lista[Math.min(i, lista.length - 1)];
  return { ...estado, lista, activa: vuelta.id };
}

export interface Guardado {
  lista: string[];
  activa: number;
}

/** Lo que se recuerda en este computador: qué está abierto y cuál adelante. */
export function paraGuardar(estado: EstadoPestanas): Guardado {
  return {
    lista: estado.lista.map((p) => p.href),
    activa: Math.max(0, estado.lista.findIndex((p) => p.id === estado.activa)),
  };
}

/**
 * Al volver a entrar. Se descarta lo dañado, lo ajeno, lo que este rol ya no
 * puede abrir y lo repetido; no pasa del tope. Sin nada que abrir devuelve null.
 */
export function restaurar(guardado: unknown, permitida: (pathname: string) => boolean): EstadoPestanas | null {
  const g = guardado as Partial<Guardado> | null;
  if (!g || !Array.isArray(g.lista)) return null;
  const lista: Pestana[] = [];
  let activa: string | null = null;
  g.lista.forEach((href, i) => {
    if (!esRutaInterna(href) || lista.length >= MAX_PESTANAS) return;
    if (!permitida(rutaDe(href)) || lista.some((p) => p.href === href)) return;
    const pestana = { id: `p${lista.length + 1}`, href };
    lista.push(pestana);
    if (i === g.activa) activa = pestana.id;
  });
  if (!lista.length) return null;
  return { lista, activa: activa ?? lista[0].id, seq: lista.length };
}
