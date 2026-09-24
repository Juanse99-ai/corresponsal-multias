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
  ArrowUp,ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { cn, esEnter } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [porBorrar, setPorBorrar] = useState<{ id: string; monto: number } | null>(null);

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
    setPorBorrar(null);
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

      <div className="mt-5 flex flex-col gap-4">
        <Tabs value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <TabsList className="w-full">
            <TabsTrigger value="compensacion">
              <ArrowsLeftRight />
              Compensación
            </TabsTrigger>
            <TabsTrigger value="retiro">
              <ArrowUp />
              Retiro
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mov-monto">Monto</Label>
            <MoneyInput id="mov-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mov-fecha">Fecha</Label>
            <Input id="mov-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mov-nota">Nota (opcional)</Label>
          <Input id="mov-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia…" onKeyDown={(e) => esEnter(e) && !pending && registrar()} />
        </div>

        <Button asChild variant="secondary" size="sm" className="max-w-full self-start">
        <label>
          <Paperclip className="shrink-0" />
          <span className="min-w-0 truncate">{file ? file.name : "Adjuntar anexo (foto o PDF)"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        </Button>

        <ErrorNotice message={error} />

        <Button onClick={registrar} disabled={pending} className="w-full sm:w-auto sm:self-start">
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
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      m.tipo === "compensacion" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                    )}
                  >
                    {m.tipo === "compensacion" ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="tnum text-[0.9rem] font-medium text-text">{formatCOP(m.monto)}</p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[0.7rem] text-faint">
                      <span className="shrink-0"><span className="capitalize">{m.tipo}</span> · {formatFecha(m.fecha)}</span>
                      {m.nota && <span className="min-w-0 truncate">· {m.nota}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={m.soporte_nombre ?? "Anexo"}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-accent-strong"
                    >
                      <ArrowSquareOut size={15} />
                    </a>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Eliminar" title="Eliminar" onClick={() => setPorBorrar({ id: m.id, monto: m.monto })} disabled={pending} className="text-muted hover:text-destructive">
                    <Trash size={17} />
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este movimiento propio?"
        monto={porBorrar?.monto ?? null}
        detalle="Cambia el saldo total del control general."
        onConfirmar={() => porBorrar && borrar(porBorrar.id)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
