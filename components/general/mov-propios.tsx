"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, Paperclip, ArrowsLeftRight, ArrowUp, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { IconButton } from "@/components/ui/icon-button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { MoneyInput } from "@/components/ui/money-input";
import { esEnter } from "@/lib/utils";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-text">
          <h2>Mis compensaciones / retiros</h2>
        </CardTitle>
      </CardHeader>

      <CardContent>
      <div className="flex flex-col gap-4">
        <ToggleGroup
          type="single"
          variant="segmentado"
          value={tipo}
          onValueChange={(v) => v && setTipo(v as typeof tipo)}
          aria-label="Tipo de movimiento"
        >
          <ToggleGroupItem value="compensacion">
            <ArrowsLeftRight />
            Compensación
          </ToggleGroupItem>
          <ToggleGroupItem value="retiro">
            <ArrowUp />
            Retiro
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-[1fr_150px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-monto">Monto</Label>
            <MoneyInput id="mov-monto" size="lg" value={monto} onValueChange={setMonto} onEnter={() => !pending && registrar()} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-fecha">Fecha</Label>
            <DatePicker id="mov-fecha" value={fecha} onChange={setFecha} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mov-nota">Nota (opcional)</Label>
          <Input id="mov-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia…" onKeyDown={(e) => esEnter(e) && !pending && registrar()} />
        </div>

        {/* Gris relleno de 38 con el clip. El campo de archivo queda enfocable
            (sr-only) y el aro se pinta en la pastilla. */}
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="max-w-full cursor-pointer self-start has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
        >
        <label>
          <Paperclip className="shrink-0" />
          <span className="min-w-0 truncate">{file ? file.name : "Adjuntar anexo (foto o PDF)"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        </Button>

        <ErrorNotice message={error} />

        <Button variant="secondary" onClick={registrar} disabled={pending} className="w-full sm:w-auto sm:self-start">
          <Plus size={16} weight="bold" />
          {pending ? "Guardando…" : "Registrar movimiento"}
        </Button>
      </div>

      {movimientos.length > 0 && (
        <ItemGroup variant="cajitas" className="mt-5 max-lg:divide-y max-lg:divide-linea-fila">
          <AnimatePresence initial={false}>
            {movimientos.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                role="listitem"
              >
                <Item className="flex-nowrap gap-3 px-0 py-2.5">
                  <ItemMedia variant="icon">
                    {m.tipo === "compensacion" ? <ArrowsLeftRight size={16} weight="bold" /> : <ArrowUp size={16} weight="bold" />}
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="tnum">{formatCOP(m.monto)}</ItemTitle>
                    <ItemDescription className="truncate text-nowrap text-faint">
                      {m.tipo === "compensacion" ? "Compensación" : "Retiro"}, {formatFecha(m.fecha)}
                      {m.nota && ` · ${m.nota}`}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="shrink-0 gap-1.5">
                    {m.url && (
                      <IconButton asChild label={m.soporte_nombre ?? "Anexo"} className="lg:size-[38px]">
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          <ArrowSquareOut size={17} />
                        </a>
                      </IconButton>
                    )}
                    <IconButton
                      label="Borrar"
                      onClick={() => setPorBorrar({ id: m.id, monto: m.monto })}
                      disabled={pending}
                      peligro
                      className="lg:size-[38px]"
                    >
                      <Trash size={17} />
                    </IconButton>
                  </ItemActions>
                </Item>
              </motion.div>
            ))}
          </AnimatePresence>
        </ItemGroup>
      )}
      </CardContent>
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este movimiento propio?"
        monto={porBorrar?.monto ?? null}
        detalle="Queda registrado en la bitácora."
        onConfirmar={() => porBorrar && borrar(porBorrar.id)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
