"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, PencilSimple, Clock, ArrowDown, Receipt, CheckCircle, WhatsappLogo, ClipboardText, FileArrowUp, Warning, Check, X } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { leerListaWhatsApp } from "@/lib/luis-parse";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn, esEnter } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatFechaCorta, formatHora, horaBogotaHHMM } from "@/lib/format";
import { TOPE_CONSIGNACION, TOPE_COMPENSACION } from "@/lib/auditoria";
import { reduced } from "@/components/fx/reduced";

/** Acuse del lote: cuántos entraron, en cuántos días y cuántos ya estaban. */
function resumenLote(insertados: number, dias: number, repetidos: number): string {
  if (insertados === 0) {
    return repetidos === 1 ? "Ese ya estaba registrado." : "Todos ya estaban registrados.";
  }
  let t = `${insertados} ${insertados === 1 ? "movimiento agregado" : "movimientos agregados"}`;
  if (dias > 1) t += ` en ${dias} días`;
  if (repetidos > 0) t += `; ${repetidos} ya ${repetidos === 1 ? "estaba" : "estaban"}`;
  return `${t}.`;
}

/**
 * Nombre de pila para las fichas del grupo. Si dos personas lo comparten,
 * todas llevan también el segundo nombre para poder distinguirlas.
 */
function nombresCortos(nombres: string[]): Map<string, string> {
  const pila = (n: string) => n.split(/\s+/)[0];
  const repetido = new Set<string>();
  const vistos = new Set<string>();
  for (const n of nombres) {
    const p = pila(n);
    if (vistos.has(p)) repetido.add(p);
    vistos.add(p);
  }
  return new Map(
    nombres.map((n) => [n, repetido.has(pila(n)) ? n.split(/\s+/).slice(0, 2).join(" ") : pila(n)]),
  );
}

export interface MovimientoItem {
  id: string;
  monto: number;
  hora: string | null;
  nota: string | null;
}

export function MovimientosSection({
  fecha,
  items,
  titulo,
  subtitulo,
  emptyText,
  tono,
  agregar,
  agregarLote,
  eliminar,
  editar }: {
  fecha: string;
  items: MovimientoItem[];
  titulo: string;
  subtitulo: string;
  emptyText: string;
  tono: "consig" | "comp";
  agregar: (raw: unknown) => Promise<{ ok: boolean; error?: string }>;
  /** Guarda varios de una, cada uno con su día (el chat que manda Luis). */
  agregarLote: (raw: unknown) => Promise<{
    ok: boolean;
    error?: string;
    insertados?: number;
    repetidos?: number;
    dias?: number;
  }>;
  eliminar: (id: string) => Promise<{ ok: boolean; error?: string }>;
  editar: (raw: unknown) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState(0);
  const [hora, setHora] = useState(horaBogotaHHMM);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Acuse visible: el destello de fila dura un segundo y con reduced-motion no existe.
  const [okMsg, setOkMsg] = useState<string | null>(null);
  // Confirmación propia en vez de window.confirm (que en la PWA de iOS corta del todo).
  const [porBorrar, setPorBorrar] = useState<MovimientoItem | null>(null);

  // Pegar el chat de WhatsApp: se lee en vivo y se revisa antes de guardar.
  const [loteAbierto, setLoteAbierto] = useState(false);
  const [loteTexto, setLoteTexto] = useState("");
  // Filas que el usuario marcó o desmarcó a mano (índice dentro de lote.movimientos).
  const [tocados, setTocados] = useState<Set<number>>(() => new Set());
  // El chat es un grupo: quien no sea Luis se puede apagar de un toque.
  const [remitentesFuera, setRemitentesFuera] = useState<Set<string>>(() => new Set());
  // Al soltar fotos aquí el navegador escribe sus rutas y se leían como montos.
  const [soltoFotos, setSoltoFotos] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const lote = useMemo(() => leerListaWhatsApp(loteTexto, fecha), [loteTexto, fecha]);
  const indiceDe = useMemo(() => new Map(lote.movimientos.map((m, i) => [m, i])), [lote]);

  // Al pegar el chat completo es fácil volver a cargar algo ya registrado. Aquí
  // solo se ve el día abierto; el servidor revisa todos los días del lote.
  const yaEnElDia = useMemo(
    () => new Set(items.map((i) => `${i.monto}@${(i.hora ?? "").slice(0, 5)}`)),
    [items],
  );
  const repetidos = useMemo(() => {
    const s = new Set<number>();
    lote.movimientos.forEach((m, i) => {
      if (m.hora && m.fecha === fecha && yaEnElDia.has(`${m.monto}@${m.hora}`)) s.add(i);
    });
    return s;
  }, [lote, yaEnElDia, fecha]);

  // Por defecto entra marcado, salvo repetidos y remitentes apagados; tocar
  // una fila invierte ese default.
  const marcadoPorDefecto = (i: number) => {
    const m = lote.movimientos[i];
    if (m?.de && remitentesFuera.has(m.de)) return false;
    return !repetidos.has(i);
  };
  const estaMarcado = (i: number) => (tocados.has(i) ? !marcadoPorDefecto(i) : marcadoPorDefecto(i));
  const seleccionados = useMemo(
    () => lote.movimientos.filter((_, i) => estaMarcado(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lote, tocados, repetidos, remitentesFuera],
  );
  const totalSeleccion = seleccionados.reduce((s, m) => s + m.monto, 0);
  const diasSeleccionados = new Set(seleccionados.map((m) => m.fecha)).size;
  const variosDias = lote.dias.length > 1;
  const etiquetas = useMemo(() => nombresCortos(lote.remitentes.map((r) => r.nombre)), [lote]);

  const [editId, setEditId] = useState<string | null>(null);
  const [eMonto, setEMonto] = useState(0);
  const [eHora, setEHora] = useState("");
  const [eNota, setENota] = useState("");

  // Filas recién agregadas (no presentes al cargar) hacen flash verde.
  const idsIniciales = useRef<Set<string> | null>(null);
  const yaEstaban = (idsIniciales.current ??= new Set(items.map((c) => c.id)));

  const total = items.reduce((s, c) => s + c.monto, 0);
  const Icon = tono === "consig" ? ArrowDown : Receipt;
  // Topes reales del negocio: el datáfono por consignación, el banco por transferencia.
  const tope = tono === "consig" ? TOPE_CONSIGNACION : TOPE_COMPENSACION;

  function avisarOk(texto: string) {
    setOkMsg(texto);
    setTimeout(() => setOkMsg(null), 4000);
  }

  function registrar() {
    if (monto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await agregar({ fecha, monto, hora: hora || null, nota: nota || null });
      if (res.ok) {
        setMonto(0);
        setNota("");
        setHora(horaBogotaHHMM());
        avisarOk("Movimiento agregado.");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function cambiarTexto(t: string) {
    setLoteTexto(t);
    setTocados(new Set());
    setRemitentesFuera(new Set());
  }

  function alternarFila(i: number) {
    setTocados((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });
  }

  function alternarRemitente(nombre: string) {
    setTocados(new Set()); // el filtro por persona manda sobre los toques sueltos
    setRemitentesFuera((prev) => {
      const s = new Set(prev);
      if (s.has(nombre)) s.delete(nombre);
      else s.add(nombre);
      return s;
    });
  }

  async function pegarDelPortapapeles() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) cambiarTexto(t);
    } catch {
      /* sin permiso de portapapeles: el usuario pega a mano en el cuadro */
    }
  }

  // El chat exportado desde WhatsApp ("Exportar chat" > "Sin archivos") es un .txt.
  async function subirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      cambiarTexto(await f.text());
    } catch {
      setError("No pude leer ese archivo. Exporta el chat sin archivos (queda un .txt).");
    }
  }

  function guardarLote() {
    if (seleccionados.length === 0) return;
    setError(null);
    setOkMsg(null);
    // Si el mensaje no trae hora, queda con la de registro (como al agregar a mano).
    const ahora = horaBogotaHHMM();
    startTransition(async () => {
      const res = await agregarLote({
        fecha,
        items: seleccionados.map((m) => ({
          fecha: m.fecha,
          monto: m.monto,
          hora: m.hora ?? ahora,
          nota: m.nota,
        })),
      });
      if (res.ok) {
        const n = res.insertados ?? seleccionados.length;
        cambiarTexto("");
        setLoteAbierto(false);
        avisarOk(resumenLote(n, res.dias ?? 1, res.repetidos ?? 0));
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo guardar la lista.");
      }
    });
  }

  function confirmarBorrado() {
    const c = porBorrar;
    setPorBorrar(null);
    if (!c) return;
    startTransition(async () => {
      const res = await eliminar(c.id);
      if (res && !res.ok) {
        setError(res.error ?? "No se pudo eliminar.");
        return;
      }
      avisarOk("Movimiento borrado.");
      router.refresh();
    });
  }

  function abrirEdicion(c: MovimientoItem) {
    setEditId(c.id);
    setEMonto(c.monto);
    // La base devuelve "09:27:00"; el input de hora y el servidor esperan "09:27".
    setEHora(formatHora(c.hora));
    setENota(c.nota ?? "");
    setError(null);
  }

  function guardarEdicion() {
    if (!editId) return;
    if (eMonto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    startTransition(async () => {
      const res = await editar({ id: editId, monto: eMonto, hora: eHora || null, nota: eNota || null });
      if (res.ok) {
        setEditId(null);
        avisarOk("Cambio guardado.");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo editar.");
      }
    });
  }

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">{titulo}</h3>
          <p className="text-sm text-muted">{subtitulo}</p>
        </div>
        <div className="text-right">
          <p className="tnum text-lg font-semibold text-text">
            <AnimatedMoney value={total} />
          </p>
          <p className="text-[0.68rem] text-faint">{items.length} {items.length === 1 ? "movimiento" : "movimientos"}</p>
        </div>
      </div>

      {/* Monto protagonista y el resto compacto: en celular el teclado numérico de
          iOS no tiene Enter, así que "Agregar" debe quedar cerca y a todo lo ancho. */}
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor={`monto-${tono}`}>Monto</Label>
        <MoneyInput id={`monto-${tono}`} size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
        {monto > tope && (
          <p className="flex items-start gap-1.5 text-[0.76rem] text-danger">
            <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
            {tono === "consig"
              ? "El datáfono no pasa de $3.000.000 por consignación: si fue un monto grande, va partido en varias."
              : "Las transferencias de Sr. Luis topan en $9.999.999: si mandó más, van en varias."}
          </p>
        )}
      </div>
      {/* flex-wrap y no grid: en iOS el input de hora tiene un ancho nativo propio
          (12h con "a. m.") que no respeta la columna y se montaba sobre la nota.
          Si los dos no caben, la nota baja a su propia línea. */}
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex w-[9.5rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor={`hora-${tono}`}>Hora</Label>
          <Input id={`hora-${tono}`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full min-w-0" />
        </div>
        <div className="flex min-w-[7rem] flex-1 flex-col gap-1.5">
          <Label htmlFor={`nota-${tono}`}>Nota (opcional)</Label>
          <Input
            id={`nota-${tono}`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Referencia…"
            onKeyDown={(e) => esEnter(e) && !pending && registrar()}
            className="w-full min-w-0"
          />
        </div>
      </div>

      <ErrorNotice message={error} className="mt-3" />

      {okMsg && (
        <Alert variant="success" role="status" className="mt-3">
          <CheckCircle weight="fill" />
          <AlertTitle className="line-clamp-none font-normal">{okMsg}</AlertTitle>
        </Alert>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button onClick={registrar} disabled={pending} className="w-full sm:w-auto">
          <Plus size={16} weight="bold" />
          {pending ? "Guardando…" : "Agregar"}
        </Button>
        {!loteAbierto && (
          <Button
            variant="secondary"
            onClick={() => setLoteAbierto(true)}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            <WhatsappLogo size={17} weight="fill" />
            Pegar de WhatsApp
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {loteAbierto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-[1rem] border border-accent/25 bg-accent-soft/30 p-4">
              <p className="text-[0.88rem] font-semibold text-text">Chat de WhatsApp</p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" variant="secondary" onClick={pegarDelPortapapeles}>
                  <ClipboardText size={16} />
                  Pegar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => archivoRef.current?.click()}
                  title="Subir el chat exportado (.txt)"
                >
                  <FileArrowUp size={16} />
                  Subir
                </Button>
                <input
                  ref={archivoRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={subirArchivo}
                  className="hidden"
                  aria-label="Subir chat exportado"
                />
              </div>

              <Textarea
                value={loteTexto}
                onChange={(e) => cambiarTexto(e.target.value)}
                onDragOver={(e) => {
                  if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
                }}
                onDrop={(e) => {
                  // Sin esto el navegador pega la ruta del archivo como texto.
                  if (e.dataTransfer?.files?.length) {
                    e.preventDefault();
                    setSoltoFotos(true);
                  }
                }}
                rows={5}
                autoFocus
                placeholder={"[3/9/26, 4:10 p. m.] Luis: 1'500.000 ese neki Andrea\n635.000 ese neki Luifer hijo\n…"}
                className="mt-3"
              />

              {soltoFotos && (
                <Alert role="status" className="mt-2 block text-[0.78rem] text-muted">
                  Aquí va el texto del chat, no las fotos. Las fotos de los comprobantes van en{" "}
                  <a href="#comprobantes" onClick={() => setSoltoFotos(false)} className="font-medium text-accent-strong underline underline-offset-2">
                    Comprobantes del día
                  </a>
                  , al final de esta página.
                </Alert>
              )}

              {loteTexto.trim() && (
                <div className="mt-3">
                  {lote.movimientos.length === 0 ? (
                    <p className="text-[0.82rem] text-danger">No encontré montos en ese texto.</p>
                  ) : (
                    <>
                      {/* El chat es un grupo: apagar a quien no manda movimientos
                          quita sus montos de un toque, sin fila por fila. */}
                      {lote.remitentes.length > 1 && (
                        <div className="mb-2.5 flex flex-wrap gap-1.5">
                          {lote.remitentes.map((r) => {
                            const dentro = !remitentesFuera.has(r.nombre);
                            return (
                              <ChoiceChip key={r.nombre} selected={dentro} onClick={() => alternarRemitente(r.nombre)}>
                                {etiquetas.get(r.nombre) ?? r.nombre}
                                <span className="tnum opacity-70">{r.n}</span>
                              </ChoiceChip>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 text-[0.82rem] font-medium text-text">
                          {seleccionados.length}
                          {seleccionados.length !== lote.movimientos.length && ` de ${lote.movimientos.length}`}{" "}
                          {seleccionados.length === 1 && seleccionados.length === lote.movimientos.length
                            ? "movimiento"
                            : "movimientos"}
                        </p>
                        <p className="tnum shrink-0 text-[0.95rem] font-semibold text-text">{formatCOP(totalSeleccion)}</p>
                      </div>

                      {/* Cada fila se puede desmarcar: en el grupo también escriben
                          otros y a veces Luis corrige un monto. */}
                      <ul className="mt-2 max-h-72 overflow-y-auto rounded-[0.8rem] border border-line bg-surface">
                        {lote.dias.map((d) => (
                          <li key={d.fecha}>
                            {variosDias && (
                              <p className="sticky top-0 flex items-baseline justify-between gap-2 border-b border-line bg-surface-2 px-3 py-1.5 text-[0.72rem] font-medium text-muted">
                                <span className={cn(d.fecha === fecha && "text-accent-strong")}>
                                  {formatFechaCorta(d.fecha)}
                                  {d.fecha === fecha && " · día abierto"}
                                </span>
                                <span className="tnum shrink-0">{formatCOP(d.total)}</span>
                              </p>
                            )}
                            <ul>
                              {d.movimientos.map((m) => {
                                const i = indiceDe.get(m) ?? -1;
                                const activo = estaMarcado(i);
                                return (
                                  <li key={i} className="border-b border-line last:border-b-0">
                                    <label
                                      className={cn(
                                        "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[0.84rem] transition-opacity",
                                        !activo && "opacity-45",
                                      )}
                                    >
                                      <Checkbox
                                        checked={activo}
                                        onCheckedChange={() => alternarFila(i)}
                                        className="shrink-0"
                                        aria-label={`Incluir ${formatCOP(m.monto)}`}
                                      />
                                      <span className="min-w-0 flex-1 leading-tight">
                                        <span className="flex items-baseline justify-between gap-2">
                                          <span className="tnum font-medium text-text">{formatCOP(m.monto)}</span>
                                          <span className="tnum shrink-0 text-[0.74rem] text-faint">
                                            {m.hora ? formatHora(m.hora) : "sin hora"}
                                          </span>
                                        </span>
                                        {(m.nota || repetidos.has(i) || lote.remitentes.length > 1) && (
                                          <span className="block truncate text-[0.74rem] text-muted">
                                            {repetidos.has(i) && <span className="font-medium text-text">Ya está · </span>}
                                            {lote.remitentes.length > 1 && m.de && (
                                              <span className="text-faint">{m.de.split(" ")[0]} · </span>
                                            )}
                                            {m.nota ?? ""}
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {repetidos.size > 0 && (
                    <p className="mt-2 text-[0.74rem] text-muted">
                      {repetidos.size === 1
                        ? "1 ya estaba registrado en este día y quedó sin marcar."
                        : `${repetidos.size} ya estaban registrados en este día y quedaron sin marcar.`}
                    </p>
                  )}
                  {lote.ignoradas.length > 0 && (
                    <details className="mt-2 text-[0.72rem] text-faint">
                      <summary className="cursor-pointer select-none">
                        No tomé en cuenta {lote.ignoradas.length} {lote.ignoradas.length === 1 ? "línea" : "líneas"} (fotos,
                        números de cuenta, texto sin monto)
                      </summary>
                      {/* El chat exportado trae miles de líneas: se muestran unas pocas. */}
                      <ul className="mt-1 max-h-32 overflow-y-auto pl-3">
                        {lote.ignoradas.slice(0, 25).map((l, i) => (
                          <li key={i} className="truncate">
                            {l}
                          </li>
                        ))}
                        {lote.ignoradas.length > 25 && <li>y {lote.ignoradas.length - 25} más</li>}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={guardarLote} disabled={pending || seleccionados.length === 0} className="flex-1 sm:flex-none">
                  <Check size={17} weight="bold" />
                  {pending
                    ? "Guardando…"
                    : seleccionados.length === 0
                      ? "Guardar"
                      : `Guardar ${seleccionados.length} ${seleccionados.length === 1 ? "movimiento" : "movimientos"}` +
                        (diasSeleccionados > 1 ? ` en ${diasSeleccionados} días` : "")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cancelar"
                  title="Cancelar"
                  onClick={() => {
                    setLoteAbierto(false);
                    cambiarTexto("");
                  }}
                  disabled={pending}
                  className="text-muted hover:text-foreground"
                >
                  <X size={17} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-1 rounded-[1rem] border border-dashed border-line-strong py-9 text-center">
          <Icon size={18} className="text-faint" />
          <p className="text-[0.82rem] text-muted">{emptyText}</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          <AnimatePresence initial={false}>
            {items.map((c) => {
              const nuevo = !yaEstaban.has(c.id) && !reduced();
              return (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className={cn("rounded-lg py-2.5", nuevo && "t-flash-ok")}
              >
                {editId === c.id ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <MoneyInput value={eMonto} onValueChange={setEMonto} autoFocus />
                      <Input type="time" value={eHora} onChange={(e) => setEHora(e.target.value)} />
                    </div>
                    <Input value={eNota} onChange={(e) => setENota(e.target.value)} placeholder="Nota (opcional)" />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={guardarEdicion} disabled={pending}>
                        <Check size={16} weight="bold" />
                        Guardar
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setEditId(null)} disabled={pending} className="text-muted hover:text-foreground">
                        <X size={17} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                        <Icon size={13} weight="bold" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="tnum text-[0.88rem] font-medium text-text">{formatCOP(c.monto)}</p>
                        {(c.hora || c.nota) && (
                          <p className="flex min-w-0 items-center gap-1 text-[0.7rem] text-faint">
                            {c.hora && (
                              <span className="flex shrink-0 items-center gap-1">
                                <Clock size={10} />
                                {formatHora(c.hora)}
                              </span>
                            )}
                            {c.nota && <span className="truncate">· {c.nota}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label="Editar" title="Editar" onClick={() => abrirEdicion(c)} disabled={pending} className="text-muted hover:text-foreground">
                        <PencilSimple size={17} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Eliminar" title="Eliminar" onClick={() => setPorBorrar(c)} disabled={pending} className="text-muted hover:text-destructive">
                        <Trash size={17} />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este movimiento?"
        monto={porBorrar?.monto ?? null}
        detalle="Cambia el saldo de Sr. Luis y el cuadre del día."
        onConfirmar={confirmarBorrado}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
