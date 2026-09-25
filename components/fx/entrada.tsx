import { Logo } from "@/components/brand";
import { ENTRADA_ID } from "@/lib/entrada";

// Corre antes de pintar: si la entrada ya salió en esta sesión (recargar, tocar
// "Actualizar"), no se repite. En el celular la sesión se acaba al cerrar la app.
const SOLO_UNA_VEZ = `try{if(sessionStorage.getItem("corr-entrada"))document.documentElement.classList.add("entrada-vista");else sessionStorage.setItem("corr-entrada","1")}catch(e){}`;

/**
 * Entrada al abrir la app: el logo aparece sobre el fondo y se abre paso a la
 * pantalla. La animación está en globals.css y no en Framer Motion porque tiene
 * que correr desde el primer pintado, antes de que cargue el JavaScript. Va
 * después del script de next-themes para que el fondo salga ya con el tema.
 */
export function Entrada() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SOLO_UNA_VEZ }} />
      <div id={ENTRADA_ID} className="entrada" aria-hidden="true">
        <Logo size={88} className="entrada-logo rounded-[1.4rem]" />
      </div>
    </>
  );
}
