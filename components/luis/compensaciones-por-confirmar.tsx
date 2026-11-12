"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { CaretLeft, CaretRight, Check, Plus, Receipt, Trash, Warning, X } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavegacion } from "@/lib/use-navegacion";
import { formatCOP, formatHora } from "@/lib/format";
import { TRANSICION } from "@/lib/movimiento";
import { cn } from "@/lib/utils";
import type { SoporteConUrl } from "@/lib/queries";
import { toleranciaDe, type DecisionCompensacion, type FilaCompensacion } from "@/lib/compensacion";
import { confirmarCompensacionFoto } from "@/app/(app)/luis/actions";
import { eliminarSoporte } from "@/app/(app)/cuadre/actions";

/** Lo que dejó la entrada del agente en corr_soportes.datos. */
interface DatosCompensacion {
  texto?: string | null;
  horaMensaje?: string | null;
  decision?: DecisionCompensacion;
}

function datosDe(s: SoporteConUrl): DatosCompensacion {
  return s.datos && typeof s.datos === "object" && !Array.isArray(s.datos) ? (s.datos as DatosCompensacion) : {};
}

/** Los pagos leídos de la foto; si no se leyó ninguno, un renglón en blanco para escribirlo. */
function filasDe(s: SoporteConUrl): FilaCompensacion[] {
  const d = datosDe(s);
  return d.decision && d.decision.filas.length > 0
    ? d.decision.filas
    : [{ fecha: s.fecha, monto: 0, hora: d.horaMensaje ?? null, nota: "Compensación foto" }];
}

const sumar = (filas: FilaCompensacion[]) => filas.reduce((s, f) => s + f.monto, 0);

/** Lo que ya se ve en el chulo o en la diferencia no se repite como motivo. */
const MOTIVOS_QUE_SOBRAN = ["Confírmala", "La suma no da los palos del mensaje", "El mensaje no dice cuántos palos"];

/**
 * Compensaciones que el Sr. Luis mandó al grupo y quedaron por confirmar
 * (app/api/agente/compensacion). En la pantalla es un solo renglón, recogido
 * (12 nov 2026, lo pidió el dueño: limpio, con íconos y sin tanto texto); al
 * tocarlo sube la ventana con la foto grande al lado de los pagos leídos.
 */
export function CompensacionesPorConfirmar({ fotos }: { fotos: SoporteConUrl[] }) {
  const nav = useNavegacion();
  const [abierta, setAbierta] = useState(false);
  const [indice, setIndice] = useState(0);
  // Hacia dónde se pasó de foto: la que entra viene de ese lado.
  const [sentido, setSentido] = useState(1);
  // Lo que se corrigió a mano en cada foto, para que no se pierda al pasar a otra.
  const [corregidas, setCorregidas] = useState<Record<string, FilaCompensacion[]>>({});
  // Fotos ya registradas o quitadas aquí: salen de una, sin esperar al servidor.
  const [resueltas, setResueltas] = useState<string[]>([]);

  const pendientes = fotos.filter((f) => !resueltas.includes(f.id));
  const total = pendientes.reduce((s, f) => s + sumar(corregidas[f.id] ?? filasDe(f)), 0);
  const actual = pendientes[Math.min(indice, pendientes.length - 1)];

  function pasar(paso: number) {
    setSentido(paso);
    setIndice((i) => (Math.min(i, pendientes.length - 1) + paso + pendientes.length) % pendientes.length);
  }

  function resolver(id: string) {
    setSentido(1);
    setResueltas((prev) => [...prev, id]);
    setIndice((i) => (i >= pendientes.length - 1 ? 0 : i));
    if (pendientes.length <= 1) setAbierta(false);
    nav.refresh();
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {pendientes.length > 0 && (
          <motion.div
            key="por-confirmar"
            id="por-confirmar"
            className="scroll-mt-20 overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSICION}
          >
            <Card className="mt-5 p-0">
              <button
                type="button"
                onClick={() => setAbierta(true)}
                aria-label={
                  pendientes.length === 1
                    ? "Revisar 1 foto del Sr. Luis por confirmar"
                    : `Revisar ${pendientes.length} fotos del Sr. Luis por confirmar`
                }
                className="flex w-full items-center gap-3 rounded-[inherit] px-4 py-3 text-left outline-none transition-colors duration-[var(--dur-1)] hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid sm:px-5"
              >
                <span className="tnum grid size-9 shrink-0 place-items-center rounded-full bg-warn-bg text-body font-semibold text-warn-fg">
                  {pendientes.length}
                </span>
                <span className="flex-1 text-title font-semibold whitespace-nowrap text-text">Por confirmar</span>
                {total > 0 && <AnimatedMoney value={total} desdeCero={false} className="min-w-0 truncate text-title font-semibold text-text" />}
                <span aria-hidden className="grid shrink-0 place-items-center rounded-full text-text-2 sm:size-9 sm:bg-surface-2">
                  <CaretRight size={16} weight="bold" />
                </span>
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={abierta && !!actual} onOpenChange={setAbierta}>
        <DialogContent
          className="gap-4 sm:max-w-[720px] sm:grid-cols-2 sm:grid-rows-[auto_1fr_auto]"
          // El foco va a la ventana, no al primer botón: si no, su tooltip sale solo al abrir.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          {actual && (
            <Revision
              key={actual.id}
              foto={actual}
              posicion={Math.min(indice, pendientes.length - 1) + 1}
              cuantas={pendientes.length}
              sentido={sentido}
              filas={corregidas[actual.id] ?? filasDe(actual)}
              onFilas={(filas) => setCorregidas((prev) => ({ ...prev, [actual.id]: filas }))}
              onPasar={pasar}
              onResuelta={() => resolver(actual.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Una foto en revisión: la foto, lo que se leyó, y registrar o quitar. */
function Revision({
  foto,
  posicion,
  cuantas,
  sentido,
  filas,
  onFilas,
  onPasar,
  onResuelta,
}: {
  foto: SoporteConUrl;
  posicion: number;
  cuantas: number;
  sentido: number;
  filas: FilaCompensacion[];
  onFilas: (filas: FilaCompensacion[]) => void;
  onPasar: (paso: number) => void;
  onResuelta: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  const [hecho, setHecho] = useState(false);
  // El renglón que se está corrigiendo. Uno sin monto nace abierto para escribirlo.
  const [editando, setEditando] = useState<number | null>(() => {
    const vacio = filas.findIndex((f) => f.monto <= 0);
    return vacio >= 0 ? vacio : null;
  });
  // El teclado solo sube si el renglón lo abrió la persona, no al pasar de foto.
  const [enfocar, setEnfocar] = useState(false);
  const corregir = (i: number) => {
    setEnfocar(true);
    setEditando(i);
  };

  const datos = datosDe(foto);
  const d = datos.decision;
  const suma = sumar(filas);
  const palos = d?.palos ?? null;
  const diferencia = palos !== null ? suma - palos : null;
  const cuadra = diferencia !== null && Math.abs(diferencia) <= toleranciaDe(datos.texto);
  const listas = filas.length > 0 && filas.every((f) => f.monto > 0);
  const motivo = d && !MOTIVOS_QUE_SOBRAN.includes(d.motivo) ? d.motivo : null;
  // La que entra viene del lado de la flecha que se tocó.
  const entra = { initial: { opacity: 0, x: 16 * sentido }, animate: { opacity: 1, x: 0 }, transition: TRANSICION };

  function registrar() {
    if (!listas || pending || hecho) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmarCompensacionFoto({
        soporteId: foto.id,
        filas: filas.map((f) => ({ monto: f.monto, hora: f.hora, nota: f.nota })),
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo registrar.");
        return;
      }
      toast.success(`Compensación de ${formatCOP(suma)} registrada.`);
      // El botón se queda en verde un momento antes de que la foto se vaya.
      setHecho(true);
      setTimeout(onResuelta, 420);
    });
  }

  function quitar() {
    setBorrar(false);
    setError(null);
    startTransition(async () => {
      const res = await eliminarSoporte(foto.id);
      if (res.ok) onResuelta();
      else setError(res.error ?? "No se pudo quitar la foto.");
    });
  }

  return (
    <>
      <div className="flex min-h-9 items-center gap-1.5 pr-10 sm:col-start-2 sm:row-start-1">
        <DialogTitle className="min-w-0 flex-1 truncate text-title sm:text-title sm:tracking-normal">Por confirmar</DialogTitle>
        <DialogDescription className="sr-only">
          Compara la foto con los pagos leídos y registra la compensación, o quita la foto si no es un pago.
        </DialogDescription>
        {cuantas > 1 && (
          <>
            <IconButton label="Foto anterior" size="icon-sm" onClick={() => onPasar(-1)} disabled={pending}>
              <CaretLeft size={16} weight="bold" />
            </IconButton>
            <span className="tnum min-w-9 text-center text-meta text-muted">
              {posicion} / {cuantas}
            </span>
            <IconButton label="Foto siguiente" size="icon-sm" onClick={() => onPasar(1)} disabled={pending}>
              <CaretRight size={16} weight="bold" />
            </IconButton>
          </>
        )}
      </div>

      <motion.a
        {...entra}
        href={foto.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir la foto completa"
        className="relative block h-[38vh] min-h-[200px] overflow-hidden rounded-2xl bg-surface-2 text-faint outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid sm:col-start-1 sm:row-span-3 sm:row-start-1 sm:h-auto sm:min-h-[440px]"
      >
        {foto.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt="Pagos del Sr. Luis" className="absolute inset-0 size-full object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <Receipt size={26} />
          </span>
        )}
      </motion.a>

      <motion.div {...entra} className="flex min-w-0 flex-col gap-2 sm:col-start-2 sm:row-start-2">
        <div className="flex min-h-7 items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate text-title", datos.texto ? "font-semibold text-text" : "text-muted")}>
            {datos.texto || "Sin mensaje"}
          </p>
          {datos.horaMensaje && <span className="tnum shrink-0 text-meta text-faint">{formatHora(datos.horaMensaje)}</span>}
          <AnimatePresence mode="wait" initial={false}>
            {diferencia === null ? null : cuadra ? (
              <motion.span
                key="cuadra"
                role="img"
                aria-label="Cuadra con los palos"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={TRANSICION}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-ok-bg text-ok-fg"
              >
                <Check size={15} weight="bold" />
              </motion.span>
            ) : (
              <motion.span key="no-cuadra" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSICION} className="shrink-0">
                <Badge variant="danger" className="tnum">
                  {diferencia > 0 ? "Sobran" : "Faltan"} {formatCOP(Math.abs(diferencia))}
                </Badge>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {motivo && (
          <p className="flex items-center gap-1.5 text-meta text-warn-fg">
            <Warning size={14} weight="bold" className="shrink-0" />
            {motivo}
          </p>
        )}

        <div role="list" className="flex flex-col">
          <AnimatePresence initial>
            {filas.map((f, i) => (
              <motion.div
                key={i}
                role="listitem"
                initial={{ opacity: 0, y: 6 }}
                // Entran de a poco (20 ms, como las filas del historial); al quitarlas no esperan.
                animate={{ opacity: 1, y: 0, transition: { ...TRANSICION, delay: Math.min(i, 8) * 0.02 } }}
                exit={{ opacity: 0, height: 0, transition: TRANSICION }}
                className="overflow-hidden border-b border-linea-fila"
              >
                {editando === i ? (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <MoneyInput
                        value={f.monto}
                        onValueChange={(n) => onFilas(filas.map((x, j) => (j === i ? { ...x, monto: n } : x)))}
                        onEnter={() => setEditando(null)}
                        disabled={pending}
                        autoFocus={enfocar}
                        name={`pago-${i + 1}`}
                      />
                    </div>
                    {filas.length > 1 && (
                      <IconButton
                        label="Quitar pago"
                        forma="suelto"
                        size="icon-sm"
                        onClick={() => {
                          onFilas(filas.filter((_, j) => j !== i));
                          setEditando(null);
                        }}
                        disabled={pending}
                      >
                        <X size={16} />
                      </IconButton>
                    )}
                    <IconButton label="Listo" size="icon-sm" onClick={() => setEditando(null)} disabled={pending}>
                      <Check size={16} weight="bold" />
                    </IconButton>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => corregir(i)}
                    disabled={pending}
                    aria-label={`Corregir el pago de ${formatCOP(f.monto)}`}
                    className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid"
                  >
                    <span className="tnum text-title text-text">{formatCOP(f.monto)}</span>
                    <span className="tnum text-meta text-faint">{f.hora ? formatHora(f.hora) : ""}</span>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <p className="mt-1 text-right">
          <AnimatedMoney value={suma} className="text-kpi font-semibold tracking-[-0.4px] text-text" />
        </p>

        <ErrorNotice message={error} />
      </motion.div>

      <div className="flex items-center gap-2 sm:col-start-2 sm:row-start-3">
        <IconButton label="No es un pago" peligro onClick={() => setBorrar(true)} disabled={pending || hecho}>
          <Trash size={18} />
        </IconButton>
        <IconButton
          label="Agregar pago"
          onClick={() => {
            onFilas([...filas, { fecha: foto.fecha, monto: 0, hora: datos.horaMensaje ?? null, nota: "Compensación foto" }]);
            corregir(filas.length);
          }}
          disabled={pending || hecho}
        >
          <Plus size={18} weight="bold" />
        </IconButton>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={registrar}
              disabled={pending || (!listas && !hecho)}
              aria-label={hecho ? "Registrada" : "Registrar"}
              className={cn(
                "w-[76px] px-0 transition-[background-color,width] duration-[var(--dur-2)] ease-[var(--ease-ios)]",
                hecho && "w-11 bg-ok-fill hover:bg-ok-fill disabled:opacity-100",
              )}
            >
              <Check size={20} weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Registrar</TooltipContent>
        </Tooltip>
      </div>

      <ConfirmDialog
        open={borrar}
        titulo="¿Quitar esta foto?"
        detalle="Se borra la foto y no se registra nada."
        confirmar="Quitar"
        onConfirmar={quitar}
        onCancelar={() => setBorrar(false)}
      />
    </>
  );
}
