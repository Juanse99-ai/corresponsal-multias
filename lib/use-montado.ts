import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/**
 * true en el navegador ya hidratado; false en el servidor y durante la hidratación.
 * Para lo que solo existe en el navegador (document.body, localStorage, la URL)
 * sin descuadrar la hidratación y sin el patrón useEffect(() => setMontado(true)).
 */
export function useMontado(): boolean {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false);
}
