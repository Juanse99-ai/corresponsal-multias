"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  Paperclip,
  ArrowsLeftRight,
  ArrowDown,
  ArrowUp,
  Warning,
  ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { cn } from "@/lib/utils";
import { formatCOP, formatFecha, hoyISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { MovPropioConUrl } from "@/lib/queries";
import { agregarMovPropio, eliminarMovPropio } from "@/app/(app)/general/actions";

const BUCKET = "corr-soportes";

export function MovPropios({ movimientos }: { movimientos: MovPropioConUrl[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"compensacion" | "retiro">("compensacion");
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function registrar() {
    if (monto <= 0) return setError("Ingresa un monto.");
    setError(null);
    startTransition(async () => {
      let soporte_path: string | null = null;
      let soporte_nombre: string | null = null;
      if (file) {
        const supabase = createClient();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `mov_propio/${fecha}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) {
          setError("No se pudo subir el anexo.");
          return;
        }
        soporte_path = path;
        soporte_nombre = file.name;
      }
      const res = await agregarMovPropio({ fecha, tipo, monto, nota: nota || null, soporte_path, soporte_nombre });
      if (res.ok) {
        setMonto(0);
        setNota("");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function borrar(id: string) {
    startTransition(async () => {
      await eliminarMovPropio(id);
      router.refresh();
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <ArrowsLeftRight size={17} weight="fill" className="text-accent" />
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">Mis compensaciones / retiros</h3>
      </div>
      <p className="text-sm text-muted">Lo que tú compensas en efectivo o retiras, con su anexo.</p>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex rounded-full border border-line bg-surface-2 p-1">
          {(["compensacion", "retiro"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={cn(
                "relative flex-1 rounded-full py-2 text-[0.8rem] font-medium capitalize transition-colors",
                tipo === t ? "text-text" : "text-faint hover:text-muted",
              )}
            >
              {tipo === t && (
                <motion.span
                  layoutId="mov-pill"
                  className="absolute inset-0 rounded-full lg-glass"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t === "compensacion" ? "Compensación" : "Retiro"}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mov-monto">Monto</Label>
            <MoneyInput id="mov-monto" value={monto} onValueChange={setMonto} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mov-fecha">Fecha</Label>
            <Input id="mov-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mov-nota">Nota (opcional)</Label>
          <Input id="mov-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia…" />
        </div>

        <label className="flex cursor-pointer items-center gap-2 self-start rounded-[--radius-card] border border-line-strong bg-surface-2 px-3.5 py-2 text-[0.82rem] text-muted transition-colors hover:text-text">
          <Paperclip size={15} />
          {file ? file.name : "Adjuntar anexo (foto o PDF)"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && (
          <div className="flex items-center gap-2 rounded-[--radius-card] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.82rem] text-danger">
            <Warning size={15} weight="fill" />
            {error}
          </div>
        )}

        <Button onClick={registrar} disabled={pending} size="sm" className="self-start">
          <Plus size={16} weight="bold" />
          {pending ? "Guardando…" : "Registrar movimiento"}
        </Button>
      </div>

      {movimientos.length > 0 && (
        <ul className="mt-5 flex flex-col divide-y divide-line">
          <AnimatePresence initial={false}>
            {movimientos.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      m.tipo === "compensacion" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                    )}
                  >
                    {m.tipo === "compensacion" ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
                  </div>
                  <div className="leading-tight">
                    <p className="tnum text-[0.9rem] font-medium text-text">{formatCOP(m.monto)}</p>
                    <p className="flex items-center gap-1.5 text-[0.7rem] text-faint">
                      <span className="capitalize">{m.tipo}</span> · {formatFecha(m.fecha)}
                      {m.nota && <span className="truncate">· {m.nota}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={m.soporte_nombre ?? "Anexo"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-accent-strong"
                    >
                      <ArrowSquareOut size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => borrar(m.id)}
                    disabled={pending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}
