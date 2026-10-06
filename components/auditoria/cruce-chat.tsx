"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardText, FileArrowUp, Check, CheckCircle, Warning, ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageGroup, Message, MessageContent, MessageFooter } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaCorta, formatHora, hoyISO } from "@/lib/format";
import { leerListaWhatsApp, conciliarDia, type Conciliacion, type MovimientoLeido } from "@/lib/luis-parse";
import { CURVA_IOS, TRANSICION } from "@/lib/movimiento";

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

  // Con el cursor al final (lo normal al pegar), mostrar la última línea
  // entera: el navegador solo baja hasta ver el cursor y la deja pegada al
  // borde de abajo del campo.
  function verUltimaLinea(el: HTMLTextAreaElement) {
    if (el.selectionEnd === el.value.length) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
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
      setError("No se pudo leer ese archivo. Exporta el chat sin archivos (queda un .txt).");
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
    // El que hace scroll es el viewport interno del ScrollArea.
    const el = hiloRef.current?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (cruce && el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [cruce]);

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Cabecera: título y, como fila de filtros, de quién son los pedidos y el día. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-5 pt-5 pb-4 sm:px-6">
        <h2 className="text-lead font-semibold tracking-[-0.3px] text-text">Cruce con el grupo</h2>
        <div className="flex flex-wrap items-center gap-2">
          {remitentes.length > 1 && (
            <NativeSelect
              id="quien"
              variante="filtro"
              aria-label="Pedidos de"
              value={nombreLuis ?? ""}
              onChange={(e) => { setQuien(e.target.value); setRegistrados(null); }}
              className="max-w-[11rem]"
            >
              {remitentes.map((r) => (
                <NativeSelectOption key={r.nombre} value={r.nombre}>{r.nombre} ({r.n})</NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          <DatePicker
            id="fecha-cruce"
            variante="filtro"
            aria-label="Día a revisar"
            value={fecha}
            onChange={(iso) => { setFecha(iso); setRegistrados(null); }}
            className="w-[8.75rem]"
          />
        </div>
      </div>

      {/* Hilo: los pedidos se leen como en el grupo de WhatsApp. */}
      <ScrollArea
        ref={hiloRef}
        className="bg-bg-soft [&>[data-slot=scroll-area-viewport]]:max-h-[30rem] [&>[data-slot=scroll-area-viewport]]:min-h-[14rem]"
      >
       <div className="px-3 pt-3 pb-4 sm:px-5">
        {lectura.movimientos.length === 0 ? (
          <Empty className="min-h-[13rem] py-6">
            <EmptyTitle>Pega o sube el chat del grupo para ver los pedidos del Sr. Luis</EmptyTitle>
          </Empty>
        ) : (
          <>
            <div className="sticky top-0 z-10 mb-3 flex justify-center">
              <Badge variant="secondary" className="font-medium">
                {formatFechaCorta(fecha)}
                {nombreLuis ? ` · ${nombreLuis}` : ""}
              </Badge>
            </div>

            {pedidos.length === 0 ? (
              <Empty compacto>
                <EmptyTitle>El chat no trae pedidos del {formatFechaCorta(fecha)}</EmptyTitle>
                <EmptyDescription>Cambia la fecha</EmptyDescription>
              </Empty>
            ) : (
              <MessageGroup role="list" className="gap-1.5">
                {pedidos.map((p, i) => {
                  const est = estadoDe(p);
                  return (
                    <motion.div
                      key={i}
                      role="listitem"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: est === "repetido" ? 0.55 : 1, y: 0 }}
                      transition={{ ...TRANSICION, delay: Math.min(i, 12) * 0.02 }}
                    >
                      <Message className="items-end">
                        <MessageContent className="w-auto max-w-[85%] gap-0.5 sm:max-w-[70%]">
                          <Bubble variant="outline" className="max-w-full">
                            <BubbleContent className="rounded-2xl rounded-bl-md px-3.5">
                              <p className={cn("tnum text-title font-semibold text-text", est === "repetido" && "line-through")}>
                                {formatCOP(p.monto)}
                              </p>
                              {p.nota && <p className="text-meta leading-snug text-muted">{p.nota}</p>}
                            </BubbleContent>
                          </Bubble>
                          {p.hora && (
                            <MessageFooter className="tnum text-label font-normal text-faint">
                              {formatHora(p.hora)}
                            </MessageFooter>
                          )}
                        </MessageContent>
                        {est && <Marca estado={est} />}
                      </Message>
                    </motion.div>
                  );
                })}
              </MessageGroup>
            )}

            {/* El resultado va en el hilo como una cajita, no como otra tarjeta. */}
            <AnimatePresence initial={false}>
              {cruce && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, ease: CURVA_IOS }}
                  className="mx-auto mt-5 max-w-[26rem] rounded-xl border border-fila-borde bg-fila p-3.5"
                >
                  <div className="grid grid-cols-3 divide-x divide-fila-borde text-center">
                    <Cifra rotulo="Pidió">{formatCOP(cruce.totalChat)}</Cifra>
                    <Cifra rotulo="Registrado">{formatCOP(cruce.totalApp)}</Cifra>
                    <Cifra rotulo="Diferencia" tono={diferencia === 0 ? "ok" : "bad"}>
                      {diferencia === 0 ? "$0" : formatCOP(diferencia)}
                    </Cifra>
                  </div>

                  {cruce.faltantes.length === 0 && cruce.sobrantes.length === 0 ? (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-ok-bg px-3 py-2.5 text-meta text-ok-fg">
                      <CheckCircle size={15} weight="fill" className="mt-px shrink-0" />
                      El día cuadra: cada pedido tiene su registro.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-1.5 text-meta">
                      {cruce.faltantes.length > 0 && (
                        <p className="text-text">
                          {cruce.faltantes.length} {cruce.faltantes.length === 1 ? "pedido" : "pedidos"} sin registro
                          <span className="text-muted"> (marcados en rojo)</span>
                        </p>
                      )}
                      {cruce.sobrantes.length > 0 && (
                        <p className="text-text">
                          Registrado sin pedido en el grupo:{" "}
                          <span className="tnum">{cruce.sobrantes.map((v) => formatCOP(v)).join(", ")}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {cruce.posiblesRepetidos.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-meta text-muted">
                      <Warning size={14} weight="fill" className="mt-px shrink-0 text-warn-fg" />
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
      </ScrollArea>

      {/* Compositor abajo, como la barra de escribir de un chat: íconos en
          círculo gris, el campo relleno y Cruzar en azul. */}
      <div className="flex flex-col gap-2 px-3 py-3 sm:px-4">
        <ErrorNotice message={error} />
        <div className="flex items-end gap-2">
          <IconButton label="Pegar el chat" onClick={pegar}>
            <ClipboardText size={19} />
          </IconButton>
          <IconButton label="Subir chat exportado (.txt)" onClick={() => archivoRef.current?.click()}>
            <FileArrowUp size={19} />
          </IconButton>
          <input ref={archivoRef} type="file" accept=".txt,text/plain" onChange={subir} className="hidden" aria-label="Subir chat exportado" />
          <Textarea
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setRegistrados(null); verUltimaLinea(e.currentTarget); }}
            rows={1}
            wrap="off"
            /* Alto de línea = alto del campo: se ve una sola línea completa, nunca media. */
            style={{ lineHeight: "2.75rem" }}
            aria-label="Chat del grupo"
            placeholder="Pega aquí el chat del grupo…"
            /* text-base: con menos de 16px iOS hace zoom al enfocar. */
            className="field-sizing-fixed h-11 min-h-0 min-w-0 flex-1 resize-none overflow-y-auto rounded-full px-4 py-0"
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

/** Una cifra del resultado: rótulo arriba y la cifra tabular, como en las celdas. */
function Cifra({ rotulo, tono, children }: { rotulo: string; tono?: "ok" | "bad"; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-2">
      <span className="truncate text-meta text-faint">{rotulo}</span>
      <span
        className={cn(
          "tnum truncate text-title font-semibold",
          tono === "ok" ? "text-ok-fg" : tono === "bad" ? "text-bad-fg" : "text-text",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Marca junto a la burbuja: círculo verde si tiene registro, chip rojo si falta. */
function Marca({ estado }: { estado: "ok" | "falta" | "repetido" }) {
  if (estado === "ok")
    return (
      <span role="img" aria-label="Registrado" className="mb-1 grid size-6 shrink-0 place-items-center rounded-full bg-ok-bg text-ok-fg">
        <Check size={13} weight="bold" />
      </span>
    );
  if (estado === "falta")
    return (
      <Badge variant="danger" className="mb-1">
        <Warning weight="fill" />
        Falta
      </Badge>
    );
  return (
    <Badge variant="secondary" className="mb-1">
      Repetido
    </Badge>
  );
}
