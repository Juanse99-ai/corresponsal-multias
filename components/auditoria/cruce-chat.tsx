"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardText, FileArrowUp, CheckCircle, Warning, ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaCorta, formatHora, hoyISO } from "@/lib/format";
import { leerListaWhatsApp, conciliarDia, type Conciliacion } from "@/lib/luis-parse";

/**
 * Cruza lo que Sr. Luis pidió por el grupo contra lo que quedó registrado ese día.
 * Solo muestra: no guarda ni cambia nada.
 */
export function CruceChat({
  montosDelDia,
  textoInicial = "",
  fechaInicial }: {
  montosDelDia: (fecha: string) => Promise<number[]>;
  /** Solo para pruebas: deja el cuadro con contenido al abrir. */
  textoInicial?: string;
  fechaInicial?: string;
}) {
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO);
  const [texto, setTexto] = useState(textoInicial);
  const [registrados, setRegistrados] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const archivoRef = useRef<HTMLInputElement>(null);

  const lectura = useMemo(() => leerListaWhatsApp(texto, fecha), [texto, fecha]);
  const remitentes = lectura.remitentes;
  // En el grupo escriben varios; los pedidos son los de Sr. Luis.
  const [quien, setQuien] = useState<string | null>(null);
  const nombreLuis =
    quien ?? remitentes.find((r) => /luis/i.test(r.nombre))?.nombre ?? remitentes[0]?.nombre ?? null;

  const pedidos = useMemo(
    () =>
      lectura.movimientos.filter(
        (m) => m.fecha === fecha && (!nombreLuis || m.de === nombreLuis || m.de === null),
      ),
    [lectura, fecha, nombreLuis],
  );

  const cruce: Conciliacion | null = useMemo(
    () => (registrados ? conciliarDia(pedidos, registrados) : null),
    [pedidos, registrados],
  );

  function cruzar() {
    setError(null);
    startTransition(async () => {
      try {
        setRegistrados(await montosDelDia(fecha));
      } catch {
        setError("No se pudieron leer las consignaciones de ese día.");
      }
    });
  }

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setTexto(t); setRegistrados(null); }
    } catch {
      /* sin permiso: el usuario pega a mano */
    }
  }

  async function subir(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setTexto(await f.text());
      setRegistrados(null);
    } catch {
      setError("No pude leer ese archivo. Exporta el chat sin archivos (queda un .txt).");
    }
  }

  const diferencia = cruce ? cruce.totalChat - cruce.totalApp : 0;

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Cruce con el grupo</h3>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={pegar}>
          <ClipboardText size={16} />
          Pegar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => archivoRef.current?.click()}>
          <FileArrowUp size={16} />
          Subir
        </Button>
        <input ref={archivoRef} type="file" accept=".txt,text/plain" onChange={subir} className="hidden" aria-label="Subir chat exportado" />
      </div>

      <Textarea
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setRegistrados(null); }}
        rows={4}
        placeholder={"[26/8/26, 4:45 p. m.] Luis: 4'000.000 esa cuenta Clínica Sonría\n…"}
        className="mt-3"
      />

      {lectura.movimientos.length > 0 && (
        <>
          {remitentes.length > 1 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="quien">Los pedidos son de</Label>
              <select
                id="quien"
                value={nombreLuis ?? ""}
                onChange={(e) => { setQuien(e.target.value); setRegistrados(null); }}
                className="h-11 w-full rounded-card border border-line-strong bg-surface-2 px-3 text-[0.9rem] text-text"
              >
                {remitentes.map((r) => (
                  <option key={r.nombre} value={r.nombre}>{r.nombre} ({r.n})</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex w-[10.5rem] shrink-0 flex-col gap-1.5">
              <Label htmlFor="fecha-cruce">Día a revisar</Label>
              <Input
                id="fecha-cruce"
                type="date"
                value={fecha}
                onChange={(e) => { setFecha(e.target.value); setRegistrados(null); }}
                className="w-full min-w-0"
              />
            </div>
            <Button onClick={cruzar} disabled={pending || pedidos.length === 0}>
              <ArrowsLeftRight size={17} weight="bold" />
              {pending ? "Cruzando…" : `Cruzar ${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}`}
            </Button>
          </div>

          {pedidos.length === 0 && (
            <p className="mt-2 text-[0.78rem] text-muted">
              El chat no trae pedidos del {formatFechaCorta(fecha)}. Cambia la fecha.
            </p>
          )}
        </>
      )}

      <ErrorNotice message={error} className="mt-3" />

      <AnimatePresence initial={false}>
        {cruce && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-[1rem] border border-line bg-surface-2 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-wide text-faint">Pidió</p>
                  <p className="tnum text-[0.95rem] font-semibold text-text">{formatCOP(cruce.totalChat)}</p>
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-wide text-faint">Registrado</p>
                  <p className="tnum text-[0.95rem] font-semibold text-text">{formatCOP(cruce.totalApp)}</p>
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-wide text-faint">Diferencia</p>
                  <p className={cn("tnum text-[0.95rem] font-semibold", diferencia === 0 ? "text-success" : "text-danger")}>
                    {diferencia === 0 ? "$0" : formatCOP(diferencia)}
                  </p>
                </div>
              </div>

              {cruce.faltantes.length === 0 && cruce.sobrantes.length === 0 ? (
                <p className="mt-4 flex items-center justify-center gap-2 text-[0.85rem] font-medium text-success">
                  <CheckCircle size={16} weight="fill" />
                  El día cuadra: cada pedido tiene su registro.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {cruce.faltantes.length > 0 && (
                    <div>
                      <p className="text-[0.82rem] font-medium text-text">
                        Pidió y no está registrado ({cruce.faltantes.length})
                      </p>
                      <ul className="mt-1.5 rounded-[0.7rem] border border-line bg-surface">
                        {cruce.faltantes.map((p, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 border-b border-line px-3 py-2 text-[0.84rem] last:border-b-0">
                            <span className="tnum shrink-0 font-medium text-text">{formatCOP(p.monto)}</span>
                            <span className="min-w-0 flex-1 truncate text-[0.74rem] text-muted">{p.nota ?? ""}</span>
                            <span className="tnum shrink-0 text-[0.74rem] text-faint">{p.hora ? formatHora(p.hora) : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cruce.sobrantes.length > 0 && (
                    <div>
                      <p className="text-[0.82rem] font-medium text-text">
                        Registrado sin pedido en el grupo ({cruce.sobrantes.length})
                      </p>
                      <p className="mt-1.5 tnum text-[0.84rem] text-text">
                        {cruce.sobrantes.map((v) => formatCOP(v)).join(" · ")}
                      </p>
                    </div>
                  )}

                  {cruce.posiblesRepetidos.length > 0 && (
                    <p className="flex items-start gap-1.5 text-[0.74rem] text-muted">
                      <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
                      {cruce.posiblesRepetidos.length}{" "}
                      {cruce.posiblesRepetidos.length === 1 ? "mensaje repetido" : "mensajes repetidos"}{" "}
                      sin contar
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
