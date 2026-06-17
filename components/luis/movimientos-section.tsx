"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, Clock, Warning, ArrowDown, Receipt } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { formatCOP, formatHora } from "@/lib/format";

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  eliminar,
}: {
  fecha: string;
  items: MovimientoItem[];
  titulo: string;
  subtitulo: string;
  emptyText: string;
  tono: "consig" | "comp";
  agregar: (raw: unknown) => Promise<{ ok: boolean; error?: string }>;
  eliminar: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState(0);
  const [hora, setHora] = useState(horaActual);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        setHora(horaActual());
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function borrar(id: string) {
    startTransition(async () => {
      await eliminar(id);
      router.refresh();
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

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`monto-${tono}`}>Monto</Label>
          <MoneyInput id={`monto-${tono}`} value={monto} onValueChange={setMonto} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`hora-${tono}`}>Hora</Label>
          <Input id={`hora-${tono}`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Label htmlFor={`nota-${tono}`}>Nota (opcional)</Label>
        <Input id={`nota-${tono}`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia…" />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-[--radius-card] border border-danger/30 bg-danger-soft px-3 py-2 text-[0.8rem] text-danger">
          <Warning size={15} weight="fill" />
          {error}
        </div>
      )}

      <Button onClick={registrar} disabled={pending} size="sm" className="mt-4 self-start">
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
            {items.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                    <Icon size={13} weight="bold" />
                  </div>
                  <div className="leading-tight">
                    <p className="tnum text-[0.88rem] font-medium text-text">{formatCOP(c.monto)}</p>
                    {(c.hora || c.nota) && (
                      <p className="flex items-center gap-1 text-[0.7rem] text-faint">
                        {c.hora && (
                          <>
                            <Clock size={10} />
                            {formatHora(c.hora)}
                          </>
                        )}
                        {c.nota && <span className="truncate">· {c.nota}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => borrar(c.id)}
                  disabled={pending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  title="Eliminar"
                >
                  <Trash size={14} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}
