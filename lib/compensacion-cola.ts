import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { SOPORTES_BUCKET } from "@/lib/queries";
import { CONTEXTO_COMPENSACION } from "@/lib/compensacion";

/**
 * Borra de "Por confirmar" las fotos que la regla de hoy descarta
 * (`pendienteQueNoEs`): la foto del almacén y su fila. Corre después de
 * responder la página, con la llave de servicio (sin cookies). Solo toca
 * fotos de compensación por confirmar. Si falta la llave, no hace nada: la
 * página igual no las muestra.
 */
export async function descartarPendientes(fotos: { id: string; path: string }[]): Promise<void> {
  if (fotos.length === 0) return;
  const sb = crearClienteAdmin();
  if (!sb) return;
  const { data: borradas, error } = await sb
    .from("corr_soportes")
    .delete()
    .in("id", fotos.map((f) => f.id))
    .eq("contexto", CONTEXTO_COMPENSACION)
    .select("path");
  if (error) {
    console.error("Compensaciones, limpiar la cola:", error);
    return;
  }
  const rutas = (borradas ?? []).map((b) => b.path).filter(Boolean);
  if (rutas.length > 0) await sb.storage.from(SOPORTES_BUCKET).remove(rutas);
  console.info(`Compensaciones: ${rutas.length} por confirmar descartadas (sin pagos ni palos)`);
}
