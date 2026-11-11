import { Logo } from "@/components/brand";
import { ENTRADA_ID } from "@/lib/entrada";

// Corre antes de pintar: si la entrada ya salió en esta sesión (recargar, tocar
// "Actualizar"), no se repite. En el celular la sesión se acaba al cerrar la app.
const SOLO_UNA_VEZ = `try{if(sessionStorage.getItem("corr-entrada"))document.documentElement.classList.add("entrada-vista");else sessionStorage.setItem("corr-entrada","1")}catch(e){}`;

// El pulso del logo, centrado en el logo (x = 0): un latido a la izquierda, pasa
// por detrás del logo y termina en la llave a la derecha. Las mismas medidas que
// la pantalla de marca al entrar (components/fx/escena-entrar.tsx). Las dos
// rayas de los lados son los flancos, que llegan hasta el borde de la pantalla.
const PULSO =
  "M-260 88 H-161 l7 -6 l7 6 h9 l6 11 l11 -43 l11 54 l7 -22 h11 l9 -10 l9 10 " +
  "H93 V48.1 A18.5 18.5 0 0 1 93.5 13.7 V31 H106.5 V13.7 A18.5 18.5 0 0 1 107 48.1 V88 H260";

/**
 * Entrada al abrir la app (11 nov 2026, la pantalla de marca): fondo carbón con
 * el logo y el nombre; la línea de pulso del logo cruza la pantalla de izquierda
 * a derecha y termina dibujando la llave, y la pantalla se recoge hacia arriba.
 * Va en CSS (globals.css, .entrada) y no en Framer Motion porque tiene que correr
 * desde el primer pintado, antes de que cargue el JavaScript. Va después del
 * script de next-themes para que el fondo salga ya con el tema.
 */
export function Entrada() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SOLO_UNA_VEZ }} />
      <div id={ENTRADA_ID} className="entrada" aria-hidden="true">
        <div className="entrada-fila">
          <span className="entrada-flanco entrada-flanco-izq" />
          <span className="entrada-flanco entrada-flanco-der" />
          <svg className="entrada-pulso" width="520" height="128" viewBox="-260 0 520 128">
            <path d={PULSO} pathLength={1} />
          </svg>
          <Logo size={120} className="entrada-logo relative rounded-[2rem]" />
        </div>
        <div className="entrada-nombre text-center leading-tight">
          <p className="text-body font-semibold text-nav-text lg:text-lead lg:tracking-[-0.3px]">
            Barrio Centro Sabanalarga 18
          </p>
          <p className="mt-0.5 text-meta text-nav-muted lg:mt-1 lg:text-body">Multidiagnósticos AS</p>
        </div>
      </div>
    </>
  );
}
