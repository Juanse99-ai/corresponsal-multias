"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, PencilSimple, Clock, ArrowDown, Receipt, CheckCircle, WhatsappLogo, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { leerListaWhatsApp } from "@/lib/luis-parse";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCOP, formatHora, horaBogotaHHMM } from "@/lib/format";
import { reduced } from "@/components/fx/reduced";

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
  /** Guarda varios de una (la lista que Luis manda por WhatsApp). */
  agregarLote: (raw: unknown) => Promise<{ ok: boolean; error?: string; insertados?: number }>;
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

  // Pegar la lista de WhatsApp: se lee en vivo y se revisa antes de guardar.
  const [loteAbierto, setLoteAbierto] = useState(false);
  const [loteTexto, setLoteTexto] = useState("");
  const lote = useMemo(() => leerListaWhatsApp(loteTexto), [loteTexto]);

  const [editId, setEditId] = useState<string | null>(null);
  const [eMonto, setEMonto] = useState(0);
  const [eHora, setEHora] = useState("");
  const [eNota, setENota] = useState("");

  // Filas recién agregadas (no presentes al cargar) hacen flash verde.
  const idsIniciales = useRef<Set<string> | null>(null);
  const yaEstaban = (idsIniciales.current ??= new Set(items.map((c) => c.id)));

  const total = items.reduce((s, c) => s + c.monto, 0);
  const Icon = tono === "consig" ? ArrowDown : Receipt;

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

  async function pegarDelPortapapeles() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setLoteTexto(t);
    } catch {
      /* sin permiso de portapapeles: el usuario pega a mano en el cuadro */
    }
  }

  function guardarLote() {
    if (lote.movimientos.length === 0) return;
    setError(null);
    setOkMsg(null);
    // Si el mensaje no trae horas, todas quedan con la hora de registro (como al agregar a mano).
    const ahora = horaBogotaHHMM();
    startTransition(async () => {
      const res = await agregarLote({
        fecha,
        items: lote.movimientos.map((m) => ({ monto: m.monto, hora: m.hora ?? ahora, nota: null })),
      });
      if (res.ok) {
        const n = res.insertados ?? lote.movimientos.length;
        setLoteTexto("");
        setLoteAbierto(false);
        avisarOk(`${n} ${n === 1 ? "movimiento agregado" : "movimientos agregados"} desde WhatsApp.`);
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
    setEHora(c.hora ?? "");
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
            onEnter={() => !pending && registrar()}
            className="w-full min-w-0"
          />
        </div>
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
            Pegar lista de WhatsApp
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.88rem] font-semibold text-text">Lista de WhatsApp</p>
                  <p className="text-[0.76rem] text-muted">
                    Pega el mensaje tal cual. Leo un monto por línea; si trae hora, también.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={pegarDelPortapapeles}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[0.78rem] font-medium text-muted transition-colors hover:text-text"
                >
                  <ClipboardText size={15} />
                  Pegar
                </button>
              </div>

              <Textarea
                value={loteTexto}
                onChange={(e) => setLoteTexto(e.target.value)}
                rows={5}
                autoFocus
                placeholder={"310.000 9:33\n1.000.000 9:34\n…"}
                className="mt-3"
              />

              {loteTexto.trim() && (
                <div className="mt-3">
                  {lote.movimientos.length === 0 ? (
                    <p className="text-[0.82rem] text-danger">No encontré montos en ese texto.</p>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between">
                        <p className="text-[0.82rem] font-medium text-text">
                          {lote.movimientos.length} {lote.movimientos.length === 1 ? "movimiento" : "movimientos"}
                        </p>
                        <p className="tnum text-[0.95rem] font-semibold text-text">{formatCOP(lote.total)}</p>
                      </div>
                      <ul className="mt-2 max-h-56 overflow-y-auto rounded-[0.8rem] border border-line bg-surface">
                        {lote.movimientos.map((m, i) => (
                          <li
                            key={`${i}-${m.texto}`}
                            className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-[0.84rem] last:border-b-0"
                          >
                            <span className="tnum font-medium text-text">{formatCOP(m.monto)}</span>
                            <span className="tnum text-[0.74rem] text-faint">{m.hora ?? "sin hora"}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {lote.ignoradas.length > 0 && (
                    <p className="mt-2 text-[0.72rem] text-faint">
                      No tomé en cuenta: {lote.ignoradas.map((l) => `"${l}"`).join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={guardarLote} disabled={pending || lote.movimientos.length === 0} className="w-full sm:w-auto">
                  {pending
                    ? "Guardando…"
                    : `Guardar ${lote.movimientos.length || ""} ${lote.movimientos.length === 1 ? "movimiento" : "movimientos"}`.replace("  ", " ")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setLoteAbierto(false);
                    setLoteTexto("");
                  }}
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={guardarEdicion} disabled={pending}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={pending}>
                        Cancelar
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
                      <button
                        onClick={() => abrirEdicion(c)}
                        disabled={pending}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40"
                        title="Editar" aria-label="Editar"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => setPorBorrar(c)}
                        disabled={pending}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                        title="Eliminar" aria-label="Eliminar"
                      >
                        <Trash size={14} />
                      </button>
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
