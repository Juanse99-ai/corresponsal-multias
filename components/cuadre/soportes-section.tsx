"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Trash,
  FilePdf,
  Receipt,
  UploadSimple,ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { createClient } from "@/lib/supabase/client";
import type { SoporteConUrl } from "@/lib/queries";
import { registrarSoporte, eliminarSoporte } from "@/app/(app)/cuadre/actions";

const BUCKET = "corr-soportes";

function pesoArchivo(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(n / 1000)} KB`;
}

export function SoportesSection({
  fecha,
  soportes,
  contexto = "cuadre",
  titulo = "Soportes del día",
  texto = "Sube la tirilla del datáfono" }: {
  fecha: string;
  soportes: SoporteConUrl[];
  contexto?: string;
  titulo?: string;
  texto?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(files: FileList | File[]) {
    const lista = Array.from(files);
    if (lista.length === 0) return;
    setError(null);
    setSubiendo(true);
    const supabase = createClient();
    for (const file of lista) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${contexto}/${fecha}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(`No se pudo subir ${file.name}.`);
        continue;
      }
      await registrarSoporte({
        fecha,
        path,
        contexto,
        nombre: file.name,
        mime: file.type || null,
        tamano: file.size });
    }
    setSubiendo(false);
    router.refresh();
  }

  function borrar(id: string) {
    setPorBorrar(null);
    startTransition(async () => {
      await eliminarSoporte(id);
      router.refresh();
    });
  }

  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={17} className="text-accent" weight="fill" />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">{titulo}</h3>
        </div>
        {soportes.length > 0 && <Badge tone="neutral">{soportes.length}</Badge>}
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files) subir(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-[1rem] border border-dashed px-4 py-8 text-center transition-colors",
          drag ? "border-accent/60 bg-accent-soft/40" : "border-line-strong hover:border-line-strong hover:bg-surface-2",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subir(e.target.files)}
        />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-accent">
          {subiendo ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}>
              <UploadSimple size={19} weight="bold" />
            </motion.span>
          ) : (
            <Receipt size={19} weight="fill" />
          )}
        </div>
        <p className="text-[0.86rem] font-medium text-text">{subiendo ? "Subiendo…" : texto}</p>
        <p className="text-[0.74rem] text-faint">Arrastra o toca · foto o PDF · hasta 10 MB</p>
      </label>

      <ErrorNotice message={error} className="mt-3" />

      {soportes.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <AnimatePresence initial={false}>
            {soportes.map((s) => {
              const esImagen = (s.mime ?? "").startsWith("image/");
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="group relative aspect-[3/4] overflow-hidden rounded-[0.9rem] border border-line bg-surface-2"
                >
                  <a href={s.url ?? "#"} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                    {esImagen && s.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.url} alt={s.nombre ?? "soporte"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                        <FilePdf size={28} className="text-danger" weight="fill" />
                        <span className="line-clamp-2 text-[0.68rem] text-muted">{s.nombre ?? "Documento"}</span>
                      </div>
                    )}
                  </a>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <span className="truncate text-[0.62rem] text-white/80">{pesoArchivo(s.tamano)}</span>
                    <ArrowSquareOut size={12} className="text-white/70" />
                  </div>

                  {/* En táctil no existe hover: el botón debe verse siempre (pointer-coarse). */}
                  <button
                    onClick={() => setPorBorrar(s.id)}
                    title="Eliminar"
                    aria-label="Eliminar soporte"
                    className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-black/55 text-white/85 opacity-0 backdrop-blur-sm transition-opacity hover:text-danger group-hover:opacity-100 pointer-coarse:opacity-100"
                  >
                    <Trash size={15} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este soporte?"
        detalle="Sin la tirilla adjunta no podrás cerrar el día."
        onConfirmar={() => porBorrar && borrar(porBorrar)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
