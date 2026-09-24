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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui/error-notice";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen, pareceImagen, esPdf, tipoDeArchivo } from "@/lib/comprimir-imagen";
import type { SoporteConUrl } from "@/lib/queries";
import { registrarSoporte, eliminarSoporte } from "@/app/(app)/cuadre/actions";

const BUCKET = "corr-soportes";
/** Cuántas suben a la vez: más que esto satura el dato móvil y va más lento. */
const EN_PARALELO = 3;

function pesoArchivo(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(n / 1000)} KB`;
}

/** Traduce el error de Storage a algo que se entienda. */
function motivo(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("row-level") || m.includes("unauthorized") || m.includes("jwt")) return "vuelve a entrar";
  if (m.includes("size") || m.includes("large")) return "pesa demasiado";
  if (m.includes("mime") || m.includes("type")) return "ese formato no se admite";
  if (m.includes("duplicate") || m.includes("exists")) return "ya estaba subida";
  return "falló la subida";
}

export function SoportesSection({
  fecha,
  soportes,
  contexto = "cuadre",
  titulo = "Soportes del día",
  texto = "Sube la tirilla del datáfono",
  detalleBorrado = "Sin la tirilla adjunta no podrás cerrar el día." }: {
  fecha: string;
  soportes: SoporteConUrl[];
  contexto?: string;
  titulo?: string;
  texto?: string;
  detalleBorrado?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Subida por tandas: con veinte fotos hay que ver que algo avanza.
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const subiendo = progreso !== null;

  async function subirUna(file: File): Promise<string | null> {
    if (!pareceImagen(file) && !esPdf(file)) return "no es foto ni PDF";

    const supabase = createClient();
    const listo = await comprimirImagen(file);
    const tipo = tipoDeArchivo(listo);
    const ext = (listo.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${contexto}/${fecha}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, listo, { upsert: false, contentType: tipo });
    if (upErr) return motivo(upErr.message ?? "");

    const res = await registrarSoporte({
      fecha,
      path,
      contexto,
      nombre: file.name,
      mime: tipo ?? null,
      tamano: listo.size });
    return res?.ok === false ? "no se pudo registrar" : null;
  }

  async function subir(files: FileList | File[]) {
    const lista = Array.from(files);
    if (lista.length === 0 || subiendo) return; // una tanda a la vez
    setError(null);
    setProgreso({ hechos: 0, total: lista.length });

    const cola = [...lista];
    const fallos: string[] = [];
    let hechos = 0;

    async function trabajador() {
      for (;;) {
        const file = cola.shift();
        if (!file) return;
        try {
          const falla = await subirUna(file);
          if (falla) fallos.push(`${file.name} (${falla})`);
        } catch {
          fallos.push(`${file.name} (falló la subida)`);
        }
        hechos += 1;
        setProgreso({ hechos, total: lista.length });
      }
    }

    await Promise.all(Array.from({ length: Math.min(EN_PARALELO, lista.length) }, trabajador));

    setProgreso(null);
    if (fallos.length > 0) {
      const detalle = fallos.slice(0, 3).join(", ");
      const resto = fallos.length > 3 ? ` y ${fallos.length - 3} más` : "";
      setError(
        `${lista.length - fallos.length} de ${lista.length} subieron. No entraron: ${detalle}${resto}.`,
      );
    }
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
        {soportes.length > 0 && <Badge variant="secondary">{soportes.length}</Badge>}
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
          // Con solo "image/*" el diálogo del Mac deja en gris las fotos cuyo
          // tipo no logra resolver (las de Fotos, iCloud o AirDrop). Nombrando
          // también las extensiones se pueden escoger, y el iPhone sigue
          // ofreciendo la Fototeca porque "image/*" está presente.
          accept="image/*,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,.pdf"
          multiple
          disabled={subiendo}
          className="hidden"
          onChange={(e) => {
            // Copiar antes de limpiar: al vaciar el input, su FileList (que es
            // viva) se queda sin archivos y no subiría nada.
            const elegidos = Array.from(e.target.files ?? []);
            e.target.value = ""; // permite volver a elegir la misma foto
            if (elegidos.length > 0) subir(elegidos);
          }}
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
        <p className="text-[0.86rem] font-medium text-text">
          {progreso ? `Subiendo ${progreso.hechos} de ${progreso.total}…` : texto}
        </p>
        <p className="text-[0.74rem] text-faint">
          {progreso
            ? "No cierres esta pantalla."
            : "Toca para escoger, o arrastra las fotos aquí · varias a la vez"}
        </p>
        {progreso && (
          <span className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-surface-2">
            <motion.span
              className="block h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${Math.round((progreso.hechos / progreso.total) * 100)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </span>
        )}
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
                  {/* Va sobre la foto: el vidrio claro se perdería, así que lleva fondo
                      oscuro propio, con la misma forma y respuesta que los demás. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPorBorrar(s.id)}
                    title="Eliminar"
                    aria-label="Eliminar soporte"
                    className="absolute right-1.5 top-1.5 bg-[oklch(0.22_0.03_258/0.62)] text-[oklch(0.97_0.01_260/0.9)] opacity-0 backdrop-blur-sm hover:bg-[oklch(0.22_0.03_258/0.75)] hover:text-[oklch(0.8_0.14_25)] group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                  >
                    <Trash size={16} />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <ConfirmDialog
        open={!!porBorrar}
        titulo="¿Borrar este soporte?"
        detalle={detalleBorrado}
        onConfirmar={() => porBorrar && borrar(porBorrar)}
        onCancelar={() => setPorBorrar(null)}
      />
    </Card>
  );
}
