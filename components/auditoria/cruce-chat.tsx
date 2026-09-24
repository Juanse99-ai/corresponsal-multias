"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardText, FileArrowUp, CheckCircle, Warning, ArrowsLeftRight, ChatsCircle } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaCorta, formatHora, hoyISO } from "@/lib/format";
import { leerListaWhatsApp, conciliarDia, type Conciliacion, type MovimientoLeido } from "@/lib/luis-parse";

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

  // Estado de cada burbuja una vez cruzado. faltantes/posiblesRepetidos traen
  // los mismos objetos de `pedidos`, así que basta comparar por referencia.
  function estadoDe(p: MovimientoLeido): "ok" | "falta" | "repetido" | null {
    if (!cruce) return null;
    if (cruce.faltantes.includes(p)) return "falta";
    if (cruce.posiblesRepetidos.includes(p)) return "repetido";
    return "ok";
  }

  // Al llegar el resultado, bajar al resumen como en un chat.
  const hiloRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = hiloRef.current;
    if (cruce && el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [cruce]);

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4 sm:items-center sm:px-6">
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Cruce con el grupo</h3>
        <div className="flex flex-wrap items-end gap-2">
          {remitentes.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quien">Pedidos de</Label>
              <NativeSelect
                id="quien"
                value={nombreLuis ?? ""}
                onChange={(e) => { setQuien(e.target.value); setRegistrados(null); }}
                className="max-w-[11rem]"
              >
                {remitentes.map((r) => (
                  <NativeSelectOption key={r.nombre} value={r.nombre}>{r.nombre} ({r.n})</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
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
        </div>
      </div>

      {/* Hilo: los pedidos se leen como en el grupo de WhatsApp. */}
      <div ref={hiloRef} className="relative max-h-[30rem] min-h-[14rem] overflow-y-auto bg-surface-2 px-3 pb-28 pt-4 sm:px-5">
        {lectura.movimientos.length === 0 ? (
          <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 text-center">
            <ChatsCircle size={28} className="text-faint" />
            <p className="max-w-[18rem] text-[0.84rem] text-muted">
              Pega o sube el chat del grupo para ver los pedidos de Sr. Luis.
            </p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 mb-3 flex justify-center">
              <span className="lg-panel rounded-full px-3 py-1 text-[0.72rem] font-medium text-muted">
                {formatFechaCorta(fecha)}
                {nombreLuis ? ` · ${nombreLuis}` : ""}
              </span>
            </div>

            {pedidos.length === 0 ? (
              <p className="py-6 text-center text-[0.8rem] text-muted">
                El chat no trae pedidos del {formatFechaCorta(fecha)}. Cambia la fecha.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {pedidos.map((p, i) => {
                  const est = estadoDe(p);
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: est === "repetido" ? 0.55 : 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 12) * 0.02 }}
                      className="flex items-end gap-2"
                    >
                      <div className="chat-bubble max-w-[85%] px-3.5 py-2 sm:max-w-[70%]">
                        <p className={cn("tnum text-[0.95rem] font-semibold text-text", est === "repetido" && "line-through")}>
                          {formatCOP(p.monto)}
                        </p>
                        {p.nota && <p className="text-[0.8rem] leading-snug text-muted">{p.nota}</p>}
                        <p className="tnum mt-0.5 text-right text-[0.68rem] text-faint">{p.hora ? formatHora(p.hora) : ""}</p>
                      </div>
                      {est && <Marca estado={est} />}
                    </motion.li>
                  );
                })}
              </ul>
            )}

            <AnimatePresence initial={false}>
              {cruce && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto mt-5 max-w-[26rem] rounded-[1.4rem] border border-line bg-surface p-4"
                >
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
                    <p className="mt-3 flex items-center justify-center gap-2 text-[0.85rem] font-medium text-success">
                      <CheckCircle size={16} weight="fill" />
                      El día cuadra: cada pedido tiene su registro.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 text-[0.8rem]">
                      {cruce.faltantes.length > 0 && (
                        <p className="text-text">
                          {cruce.faltantes.length} {cruce.faltantes.length === 1 ? "pedido" : "pedidos"} sin registro
                          <span className="text-muted"> (marcados en rojo)</span>
                        </p>
                      )}
                      {cruce.sobrantes.length > 0 && (
                        <p className="text-text">
                          Registrado sin pedido en el grupo:{" "}
                          <span className="tnum">{cruce.sobrantes.map((v) => formatCOP(v)).join(" · ")}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {cruce.posiblesRepetidos.length > 0 && (
                    <p className="mt-2 flex items-start justify-center gap-1.5 text-[0.74rem] text-muted">
                      <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
                      {cruce.posiblesRepetidos.length}{" "}
                      {cruce.posiblesRepetidos.length === 1 ? "mensaje repetido" : "mensajes repetidos"}{" "}
                      sin contar
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Compositor flotante de vidrio, como la barra de escribir de un chat. */}
      <div className="relative -mt-24 px-2 pb-2 sm:px-3 sm:pb-3">
        <ErrorNotice message={error} className="mb-2" />
        <div className="lg-panel flex items-end gap-1.5 rounded-[1.6rem] p-1.5">
          <Button variant="ghost" size="icon" aria-label="Pegar el chat" title="Pegar el chat" onClick={pegar} className="text-muted hover:text-foreground">
            <ClipboardText size={19} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Subir chat exportado (.txt)" title="Subir chat exportado (.txt)" onClick={() => archivoRef.current?.click()} className="text-muted hover:text-foreground">
            <FileArrowUp size={19} />
          </Button>
          <input ref={archivoRef} type="file" accept=".txt,text/plain" onChange={subir} className="hidden" aria-label="Subir chat exportado" />
          <Textarea
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setRegistrados(null); }}
            rows={1}
            wrap="off"
            /* Alto de línea = alto del campo: se ve una sola línea completa, nunca media. */
            style={{ lineHeight: "2.75rem" }}
            aria-label="Chat del grupo"
            placeholder="Pega aquí el chat del grupo…"
            /* text-base: con menos de 16px iOS hace zoom al enfocar. */
            className="field-sizing-fixed h-11 min-h-0 min-w-0 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-2 py-0 shadow-none focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            onClick={cruzar}
            disabled={pending || pedidos.length === 0}
            aria-label={pedidos.length > 0 ? `Cruzar ${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}` : "Cruzar"}
            className="shrink-0 px-4"
          >
            <ArrowsLeftRight size={17} weight="bold" />
            {/* En celular solo el ícono y la cantidad: el campo necesita el ancho. */}
            <span className="hidden sm:inline">{pending ? "Cruzando…" : "Cruzar"}</span>
            {pedidos.length > 0 && <span className="tnum">{pedidos.length}</span>}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Marca junto a la burbuja: verde si tiene registro, rojo si falta. */
function Marca({ estado }: { estado: "ok" | "falta" | "repetido" }) {
  if (estado === "ok")
    return <CheckCircle size={18} weight="fill" className="mb-1 shrink-0 text-success" aria-label="Registrado" />;
  if (estado === "falta")
    return (
      <span className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[0.7rem] font-medium text-danger">
        <Warning size={12} weight="fill" />
        Falta
      </span>
    );
  return <span className="mb-1 shrink-0 text-[0.7rem] text-faint">Repetido</span>;
}
