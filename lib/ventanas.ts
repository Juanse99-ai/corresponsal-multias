/**
 * Pestañas del computador, como en Biela: la tira va en la barra de arriba y
 * el riel y la barra quedan fijos; solo cambia el contenido. Cada pestaña de
 * más es la app dentro de un iframe del mismo sitio que ocupa el lugar del
 * contenido (adentro se esconden riel y barra), así cada una conserva lo que
 * se estaba escribiendo o viendo. La principal es la página de siempre. Aquí
 * va lo que no depende de React: el protocolo de mensajes, los nombres y lo
 * que se guarda.
 */

/** Más de esto pesa en el computador (cada pestaña es la app completa). */
export const MAX_PESTANAS = 6;

export const CLAVE_GUARDADAS = "corr-pestanas:v1";

/** Evento de la ventana principal para abrir una pestaña sin pasar por postMessage. */
export const EVENTO_ABRIR = "corr-abrir-pestana";

/**
 * Corre antes de pintar. Dentro de una pestaña marca <html> para que el CSS
 * esconda el marco de la app de afuera (entrada, bienvenida). Si la sesión se
 * vence o se cierra dentro de una pestaña, el login sale en la ventana de
 * afuera y no metido en la pestaña.
 */
export const SCRIPT_EN_VENTANA = `try{if(window.top!==window.self&&window.top.location.origin===location.origin){if(/^\\/(login|sin-acceso)(\\/|$)/.test(location.pathname))window.top.location.replace(location.pathname+location.search);else document.documentElement.classList.add("en-ventana")}}catch(e){}`;

export type MensajeVentana =
  /** La pestaña cambió de pantalla (hijo → principal). */
  | { corr: "ventana"; tipo: "href"; href: string }
  /** Pedir una pestaña nueva (hijo → principal). */
  | { corr: "ventana"; tipo: "abrir"; href: string; activar: boolean }
  /** La pestaña vuelve a verse: traer los datos frescos (principal → hijo). */
  | { corr: "ventana"; tipo: "refrescar" }
  /** El menú de afuera pide otra pantalla para la pestaña de adelante (principal → hijo). */
  | { corr: "ventana"; tipo: "ir"; href: string };

export function esMensajeVentana(data: unknown): data is MensajeVentana {
  return typeof data === "object" && data !== null && (data as { corr?: unknown }).corr === "ventana";
}

/** Solo rutas de esta app: nada de otro dominio, ni "//otro.com" ni "/\\otro.com"
 *  (el navegador lee las dos como otro sitio). */
export function esRutaInterna(href: unknown): href is string {
  return typeof href === "string" && /^\/(?![\\/])/.test(href);
}

/** "Cuadre", o "Cuadre 25/10" si la pantalla es de otro día. `nombreDe` da el
 *  nombre de la sección por su ruta (sale de NAV; aquí no se importa para que
 *  las pruebas corran en Node sin la app). */
export function tituloDe(href: string, nombreDe: (pathname: string) => string | undefined): string {
  const url = new URL(href, "http://x");
  const nombre = nombreDe(url.pathname) ?? "Corresponsal";
  const fecha = url.searchParams.get("fecha")?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return fecha ? `${nombre} ${fecha[2]}/${fecha[1]}` : nombre;
}

export interface Guardada {
  id: string;
  href: string;
}

/** Lo guardado en localStorage, si sirve. Lo dañado o ajeno se descarta. */
export function leerGuardadas(raw: string | null): Guardada[] {
  if (!raw) return [];
  try {
    const lista: unknown = JSON.parse(raw);
    if (!Array.isArray(lista)) return [];
    return lista
      .filter(
        (p): p is Guardada =>
          typeof p === "object" && p !== null && typeof p.id === "string" && esRutaInterna(p.href),
      )
      .slice(0, MAX_PESTANAS - 1)
      .map(({ id, href }) => ({ id, href }));
  } catch {
    return [];
  }
}
