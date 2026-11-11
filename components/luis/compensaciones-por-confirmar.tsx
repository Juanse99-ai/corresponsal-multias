"use client";

import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { HandCoins, Check, Trash, Plus, X, ChatText } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { Contador } from "@/components/ui/contador";
import { MoneyInput } from "@/components/ui/money-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ItemGroup, Item, ItemContent, ItemActions, ItemSeparator } from "@/components/ui/item";
import { useNavegacion } from "@/lib/use-navegacion";
import { formatCOP, formatHora } from "@/lib/format";
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

/**
 * Compensaciones que el Sr. Luis mandó al grupo y quedaron por confirmar
 * (app/api/agente/compensacion). Se ve lo que se leyó, si cuadra con los palos
 * del mensaje, y se corrige un monto antes de registrar.
 */
export function CompensacionesPorConfirmar({ fotos }: { fotos: SoporteConUrl[] }) {
  if (fotos.length === 0) return null;
  return (
    <Card id="por-confirmar" className="mt-5 scroll-mt-20 p-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-text" icono={<HandCoins weight="bold" />}>
          Por confirmar <Contador n={fotos.length} tono="aviso" aria-hidden className="ml-1 align-middle" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup variant="cajitas" className="mt-3">
          {fotos.map((f, i) => (
            <Fragment key={f.id}>
              {i > 0 && <ItemSeparator />}
              <FotoCompensacion foto={f} />
            </Fragment>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

function FotoCompensacion({ foto }: { foto: SoporteConUrl }) {
  const nav = useNavegacion();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  const datos = datosDe(foto);
  const d = datos.decision;
  const [filas, setFilas] = useState<FilaCompensacion[]>(() =>
    d && d.filas.length > 0 ? d.filas : [{ fecha: foto.fecha, monto: 0, hora: datos.horaMensaje ?? null, nota: "Compensación foto" }],
  );

  const suma = filas.reduce((s, f) => s + f.monto, 0);
  const palos = d?.palos ?? null;
  const diferencia = palos !== null ? suma - palos : null;
  const listas = filas.length > 0 && filas.every((f) => f.monto > 0);
  // Lo que ya se sabe por el estado (cuadra o no) no se repite como motivo.
  const motivo = d && !["Confírmala", "La suma no da los palos del mensaje", "El mensaje no dice cuántos palos"].includes(d.motivo)
    ? d.motivo
    : null;

  function cambiar(i: number, monto: number) {
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, monto } : f)));
  }

  function registrar() {
    if (!listas) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmarCompensacionFoto({
        soporteId: foto.id,
        filas: filas.map((f) => ({ monto: f.monto, hora: f.hora, nota: f.nota })),
      });
      if (res.ok) {
        toast.success(`Compensación de ${formatCOP(suma)} registrada.`);
        nav.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar.");
      }
    });
  }

  function quitar() {
    setBorrar(false);
    startTransition(async () => {
      const res = await eliminarSoporte(foto.id);
      if (res.ok) nav.refresh();
      else setError(res.error ?? "No se pudo quitar la foto.");
    });
  }

  return (
    <Item size="sm" role="listitem" className="flex-col items-stretch gap-3 px-0 py-3">
      <div className="flex items-start gap-3">
        <a
          href={foto.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2"
          aria-label="Ver la foto"
        >
          {foto.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.url} alt="Pagos del Sr. Luis" className="size-full object-cover" />
          )}
        </a>
        <ItemContent className="min-w-0 gap-1">
          <p className="flex min-w-0 items-center gap-1.5 text-body text-text">
            <ChatText size={15} weight="bold" className="shrink-0 text-muted" />
            <span className="truncate">{datos.texto || "Sin mensaje"}</span>
            {datos.horaMensaje && <span className="tnum shrink-0 text-meta text-faint">{formatHora(datos.horaMensaje)}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {diferencia === null ? (
              <Badge variant="secondary">Sin palos</Badge>
            ) : Math.abs(diferencia) <= toleranciaDe(datos.texto) ? (
              <Badge variant="success">
                <Check weight="bold" />
                Cuadra
              </Badge>
            ) : (
              <Badge variant="danger">{diferencia > 0 ? "Sobran" : "Faltan"} {formatCOP(Math.abs(diferencia))}</Badge>
            )}
            {motivo && <span className="text-meta text-muted">{motivo}</span>}
          </div>
        </ItemContent>
        <ItemActions>
          <IconButton label="Quitar foto" forma="gris" peligro onClick={() => setBorrar(true)} disabled={pending}>
            <Trash size={17} />
          </IconButton>
        </ItemActions>
      </div>

      <div className="flex flex-col gap-2">
        {filas.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <MoneyInput value={f.monto} onValueChange={(n) => cambiar(i, n)} disabled={pending} name={`pago-${i + 1}`} />
            </div>
            <span className="tnum w-14 shrink-0 text-right text-meta text-faint">{f.hora ? formatHora(f.hora) : ""}</span>
            <IconButton
              label="Quitar pago"
              forma="suelto"
              onClick={() => setFilas((prev) => prev.filter((_, j) => j !== i))}
              disabled={pending || filas.length === 1}
            >
              <X size={16} />
            </IconButton>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-meta text-muted">{filas.length === 1 ? "1 pago" : `${filas.length} pagos`}</span>
        <span className="tnum text-title font-semibold text-text">{formatCOP(suma)}</span>
      </div>

      <ErrorNotice message={error} />

      <div className="flex items-center gap-2">
        <Button onClick={registrar} disabled={pending || !listas} className="flex-1 sm:flex-none">
          <Check size={17} weight="bold" />
          {pending ? "Registrando…" : "Registrar"}
        </Button>
        <IconButton
          label="Agregar pago"
          forma="gris"
          onClick={() =>
            setFilas((prev) => [...prev, { fecha: foto.fecha, monto: 0, hora: datos.horaMensaje ?? null, nota: "Compensación foto" }])
          }
          disabled={pending}
        >
          <Plus size={17} weight="bold" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={borrar}
        titulo="¿Quitar esta foto?"
        detalle="Se borra la foto y no se registra nada."
        confirmar="Quitar"
        onConfirmar={quitar}
        onCancelar={() => setBorrar(false)}
      />
    </Item>
  );
}
