"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, PencilSimple, Clock,ArrowDown, Receipt } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { ErrorNotice } from "@/components/ui/error-notice";
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
  eliminar,
  editar }: {
  fecha: string;
  items: MovimientoItem[];
  titulo: string;
  subtitulo: string;
  emptyText: string;
  tono: "consig" | "comp";
  agregar: (raw: unknown) => Promise<{ ok: boolean; error?: string }>;
  eliminar: (id: string) => Promise<{ ok: boolean; error?: string }>;
  editar: (raw: unknown) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState(0);
  const [hora, setHora] = useState(horaBogotaHHMM);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [eMonto, setEMonto] = useState(0);
  const [eHora, setEHora] = useState("");
  const [eNota, setENota] = useState("");

  // Filas recién agregadas (no presentes al cargar) hacen flash verde.
  const idsIniciales = useRef<Set<string> | null>(null);
  const yaEstaban = (idsIniciales.current ??= new Set(items.map((c) => c.id)));

  const total = items.reduce((s, c) => s + c.monto, 0);
  const Icon = tono === "consig" ? ArrowDown : Receipt;

  function registrar() {
    if (monto <= 0) return setError("Ingresa un monto mayor a cero.");
    setError(null);
    startTransition(async () => {
      const res = await agregar({ fecha, monto, hora: hora || null, nota: nota || null });
      if (res.ok) {
        setMonto(0);
        setNota("");
        setHora(horaBogotaHHMM());
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function borrar(c: MovimientoItem) {
    if (
      !window.confirm(
        `¿Borrar este movimiento de ${formatCOP(c.monto)}? Cambia el saldo de Luis y el cuadre del día.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await eliminar(c.id);
      if (res && !res.ok) {
        setError(res.error ?? "No se pudo eliminar.");
        return;
      }
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
          <p className="text-[0.68rem] text-faint">{items.length} mov.</p>
        </div>
      </div>

      {/* Monto protagonista y el resto compacto: en celular el teclado numérico de
          iOS no tiene Enter, así que "Agregar" debe quedar cerca y a todo lo ancho. */}
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor={`monto-${tono}`}>Monto</Label>
        <MoneyInput id={`monto-${tono}`} size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
      </div>
      <div className="mt-3 grid grid-cols-[8.75rem_1fr] gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`hora-${tono}`}>Hora</Label>
          <Input id={`hora-${tono}`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="min-w-0" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`nota-${tono}`}>Nota (opcional)</Label>
          <Input id={`nota-${tono}`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia…" onEnter={() => !pending && registrar()} />
        </div>
      </div>

      <ErrorNotice message={error} className="mt-3" />

      <Button onClick={registrar} disabled={pending} className="mt-4 w-full sm:w-auto sm:self-start">
        <Plus size={16} weight="bold" />
        {pending ? "Guardando…" : "Agregar"}
      </Button>

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
                animate={
                  nuevo
                    ? { opacity: 1, y: 0, backgroundColor: ["rgba(29,158,117,0.2)", "rgba(29,158,117,0)"] }
                    : { opacity: 1, y: 0 }
                }
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30, backgroundColor: { duration: 1.2, ease: "easeOut" } }}
                className="rounded-lg py-2.5"
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
                        onClick={() => borrar(c)}
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
    </Card>
  );
}
