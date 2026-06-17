import { Plus, PencilSimple, Trash, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha, formatFechaHora } from "@/lib/format";
import type { AuditEntry } from "@/lib/queries";

const TABLA: Record<string, string> = {
  corr_cuadres: "el cuadre",
  corr_consignaciones_luis: "una consignación de Luis",
  corr_compensaciones_luis: "una compensación de Luis",
  corr_deudas: "un préstamo",
  corr_abonos: "un abono",
  corr_general: "el control general",
  corr_mov_propios: "un movimiento propio",
  corr_soportes: "un soporte",
};

const ACCION: Record<string, { verbo: string; color: string; bg: string }> = {
  INSERT: { verbo: "registró", color: "text-success", bg: "bg-success-soft" },
  UPDATE: { verbo: "editó", color: "text-accent-strong", bg: "bg-accent-soft" },
  DELETE: { verbo: "borró", color: "text-danger", bg: "bg-danger-soft" },
};

function montoDe(e: AuditEntry): number | null {
  const src = (e.despues ?? e.antes) as Record<string, unknown> | null;
  if (!src) return null;
  const raw = src.monto ?? src.total_tirilla ?? src.saldo_luis ?? null;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : null;
  return n != null && !Number.isNaN(n) ? n : null;
}

export function BitacoraView({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
          <ShieldCheck size={20} />
        </div>
        <p className="text-sm text-muted">Aún no hay movimientos registrados.</p>
        <p className="text-[0.78rem] text-faint">Cada cambio en cuadres, Luis, préstamos y caja quedará aquí.</p>
      </Card>
    );
  }

  return (
    <Card className="p-2 sm:p-3">
      <ul className="flex flex-col divide-y divide-line">
        {entries.map((e) => {
          const acc = ACCION[e.accion] ?? { verbo: e.accion, color: "text-muted", bg: "bg-surface-2" };
          const tabla = TABLA[e.tabla] ?? e.tabla;
          const monto = montoDe(e);
          const Icon = e.accion === "INSERT" ? Plus : e.accion === "DELETE" ? Trash : PencilSimple;
          return (
            <li key={e.id} className="flex items-center gap-3 px-2 py-3 sm:px-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", acc.bg, acc.color)}>
                <Icon size={16} weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.88rem] text-text">
                  <span className="font-semibold">{e.actorNombre}</span>{" "}
                  <span className={acc.color}>{acc.verbo}</span> {tabla}
                  {e.fecha_dato && <span className="text-muted"> del {formatFecha(e.fecha_dato)}</span>}
                  {monto != null && <span className="tnum text-muted"> · {formatCOP(monto)}</span>}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[0.72rem] text-faint">
                {formatFechaHora(e.created_at)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
