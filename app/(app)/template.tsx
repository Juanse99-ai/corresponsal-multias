/**
 * Cada pantalla entra por bloques (estilo del taller): la cabecera y luego
 * cada tarjeta, con 45 ms de diferencia. La animación está en globals.css
 * (.entra-bloques). Es un template y no el layout para que se monte de nuevo
 * al cambiar de pantalla.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="entra-bloques">{children}</div>;
}
