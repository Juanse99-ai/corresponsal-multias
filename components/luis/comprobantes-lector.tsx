"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { formatCOP, formatFechaCorta, formatHora, horaBogotaHHMM } from "@/lib/format";
import type { ComprobanteLeido } from "@/app/(app)/luis/actions";

/** Lo que se guarda como nota del movimiento: qué fue y para quién. */
function notaDe(c: ComprobanteLeido): string | null {
  const partes = [c.transaccion, c.titular].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ").slice(0, 200) : null;
}

export function ComprobantesLector({
  fecha,
  cantidadFotos,
  leerFotos,
  guardarLote }: {
  fecha: string;
  cantidadFotos: number;
  leerFotos: (fecha: string) => Promise<{ ok: boolean; error?: string; items?: ComprobanteLeido[] }>;
  guardarLote: (raw: unknown) => Promise<{
    ok: boolean;
    error?: string;
    insertados?: number;
    repetidos?: number;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ComprobanteLeido[] | null>(null);
  const [tocados, setTocados] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  /** Utilizable = se entendió la tirilla y trae monto. */
  const sirve = (c: ComprobanteLeido) => c.esComprobante && typeof c.monto === "number" && c.monto > 0;
  // Lo dudoso entra desmarcado: que lo confirme el ojo, no la máquina.
  const porDefecto = (c: ComprobanteLeido) => sirve(c) && c.seguro;
  const marcado = (i: number, c: ComprobanteLeido) =>
    sirve(c) && (tocados.has(i) ? !porDefecto(c) : porDefecto(c));

  const seleccion = useMemo(
    () => (items ?? []).filter((c, i) => marcado(i, c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, tocados],
  );
  const total = seleccion.reduce((s, c) => s + (c.monto ?? 0), 0);
  const dudosos = (items ?? []).filter((c) => sirve(c) && !c.seguro).length;
  const fallidos = (items ?? []).filter((c) => !sirve(c)).length;

  function alternar(i: number) {
    setTocados((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });
  }

  function leer() {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await leerFotos(fecha);
      if (res.ok && res.items) {
        setItems(res.items);
        setTocados(new Set());
      } else {
        setError(res.error ?? "No se pudieron leer las fotos.");
      }
    });
  }

  function guardar() {
    if (seleccion.length === 0) return;
    setError(null);
    const ahora = horaBogotaHHMM();
    startTransition(async () => {
      const res = await guardarLote({
        fecha,
        items: seleccion.map((c) => ({
          fecha: c.fecha ?? fecha,
          monto: c.monto as number,
          hora: c.hora ?? ahora,
          nota: notaDe(c),
        })),
      });
      if (res.ok) {
        const n = res.insertados ?? seleccion.length;
        const rep = res.repetidos ?? 0;
        setItems(null);
        setOkMsg(
          n === 0
            ? "Todas ya estaban registradas."
            : `${n} ${n === 1 ? "consignación agregada" : "consignaciones agregadas"}` +
                (rep > 0 ? `; ${rep} ya ${rep === 1 ? "estaba" : "estaban"}` : "") +
                ".",
        );
        setTimeout(() => setOkMsg(null), 6000);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudieron guardar.");
      }
    });
  }

  if (cantidadFotos === 0) return null;

  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">
            Llenar consignaciones desde las fotos
          </h3>
          <p className="mt-0.5 text-[0.78rem] text-muted">
            Leo el monto, la hora y el titular de cada tirilla del {formatFechaCorta(fecha)}. Nada se
            guarda sin que lo revises.
          </p>
        </div>
        {!items && (
          <Button onClick={leer} disabled={pending} className="shrink-0">
            <Sparkle size={16} weight="fill" />
            {pending ? "Leyendo…" : `Leer ${cantidadFotos}`}
          </Button>
        )}
      </div>

      <ErrorNotice message={error} className="mt-3" />

      {okMsg && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-card border border-success/30 bg-success-soft px-3 py-2 text-[0.8rem] text-success"
        >
          <CheckCircle size={15} weight="fill" />
          {okMsg}
        </div>
      )}

      <AnimatePresence initial={false}>
        {items && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[0.82rem] font-medium text-text">
                  {seleccion.length} de {items.length}{" "}
                  {items.length === 1 ? "comprobante" : "comprobantes"}
                </p>
                <p className="tnum shrink-0 text-[0.95rem] font-semibold text-text">
                  {formatCOP(total)}
                </p>
              </div>

              <ul className="mt-2 max-h-80 overflow-y-auto rounded-[0.8rem] border border-line bg-surface">
                {items.map((c, i) => {
                  const utilizable = sirve(c);
                  const activo = marcado(i, c);
                  return (
                    <li key={c.soporteId} className="border-b border-line last:border-b-0">
                      <label
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-[0.84rem] transition-opacity",
                          utilizable ? "cursor-pointer" : "cursor-default",
                          !activo && "opacity-45",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={activo}
                          disabled={!utilizable}
                          onChange={() => alternar(i)}
                          className="h-4 w-4 shrink-0 accent-accent"
                          aria-label={`Incluir ${c.monto ? formatCOP(c.monto) : c.nombre ?? "comprobante"}`}
                        />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="tnum font-medium text-text">
                              {utilizable ? formatCOP(c.monto as number) : "Sin monto"}
                            </span>
                            <span className="tnum shrink-0 text-[0.74rem] text-faint">
                              {c.hora ? formatHora(c.hora) : "sin hora"}
                            </span>
                          </span>
                          <span className="block truncate text-[0.74rem] text-muted">
                            {!utilizable && (
                              <span className="text-danger">
                                {c.error ?? "No es una tirilla legible"} ·{" "}
                              </span>
                            )}
                            {utilizable && !c.seguro && (
                              <>
                                {/* El separador va fuera del inline-flex: adentro se
                                    come el espacio final y queda "Revísala ·Depósito". */}
                                <span className="inline-flex items-center gap-1 font-medium text-text">
                                  <Warning size={11} weight="fill" />
                                  Revísala
                                </span>
                                {" · "}
                              </>
                            )}
                            {notaDe(c) ?? c.nombre ?? ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {dudosos > 0 && (
                <p className="mt-2 text-[0.74rem] text-muted">
                  {dudosos === 1 ? "1 quedó dudosa" : `${dudosos} quedaron dudosas`} y{" "}
                  {dudosos === 1 ? "no viene marcada" : "no vienen marcadas"}: compárala con la foto
                  antes de incluirla.
                </p>
              )}
              {fallidos > 0 && (
                <p className="mt-1 text-[0.74rem] text-muted">
                  {fallidos === 1 ? "1 foto no se pudo leer" : `${fallidos} fotos no se pudieron leer`}.
                  Esas tocan a mano.
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={guardar}
                  disabled={pending || seleccion.length === 0}
                  className="w-full sm:w-auto"
                >
                  {pending
                    ? "Guardando…"
                    : seleccion.length === 0
                      ? "Guardar"
                      : `Guardar ${seleccion.length} ${seleccion.length === 1 ? "consignación" : "consignaciones"}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setItems(null)}
                  disabled={pending}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
