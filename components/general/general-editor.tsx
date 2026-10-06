"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FloppyDisk, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { TarjetaNavy, NavyRotulo } from "@/components/ui/navy";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import { computeSaldoTotal } from "@/lib/general";
import { guardarGeneral } from "@/app/(app)/general/actions";

interface Inicial {
  saldo_luis: number;
  saldo_cristian: number;
  cupo_disponible: number;
  efectivo: number;
  nequis: number;
  monedas: number;
  deudas_terceros: number;
  nota: string;
}

export function GeneralEditor({
  fecha,
  inicial,
  saldoLuisSugerido,
  existente,
}: {
  fecha: string;
  inicial: Inicial;
  saldoLuisSugerido: number;
  existente: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [vals, setVals] = useState({
    saldo_luis: inicial.saldo_luis,
    saldo_cristian: inicial.saldo_cristian,
    cupo_disponible: inicial.cupo_disponible,
    efectivo: inicial.efectivo,
    nequis: inicial.nequis,
    monedas: inicial.monedas,
    deudas_terceros: inicial.deudas_terceros,
  });
  const [nota, setNota] = useState(inicial.nota);
  const set = (k: keyof typeof vals) => (n: number) => setVals((s) => ({ ...s, [k]: n }));

  const total = useMemo(() => computeSaldoTotal(vals), [vals]);

  function guardar() {
    startTransition(async () => {
      const res = await guardarGeneral({ fecha, ...vals, nota: nota.trim() || null });
      if (res.ok) {
        toast.success("Control general guardado.");
        router.refresh();
      } else {
        toast.error(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="text-text">
            <h2>Balance del día</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Campo
            label="Saldo Luis"
            id="saldo_luis"
            accion={
              vals.saldo_luis !== saldoLuisSugerido && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Terciaria pegada al campo: en la fila del rótulo, sin
                        agrandarla (toque de 44 con el ::after). */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => set("saldo_luis")(saldoLuisSugerido)}
                      className="-my-2 h-7 gap-1 px-2 text-meta after:absolute after:inset-x-0 after:-inset-y-2"
                    >
                      <ArrowClockwise size={14} />
                      Usar <span className="tnum">{formatCOP(saldoLuisSugerido)}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Usar el saldo de la cuenta del Sr. Luis</TooltipContent>
                </Tooltip>
              )
            }
          >
            <MoneyInput id="saldo_luis" value={vals.saldo_luis} onValueChange={set("saldo_luis")} />
          </Campo>

          <Campo label="Saldo Cristian" id="saldo_cristian">
            <MoneyInput id="saldo_cristian" value={vals.saldo_cristian} onValueChange={set("saldo_cristian")} />
          </Campo>

          <Campo label="Cupo disponible" id="cupo_disponible">
            <MoneyInput id="cupo_disponible" value={vals.cupo_disponible} onValueChange={set("cupo_disponible")} />
          </Campo>
          <Campo label="Efectivo" id="efectivo">
            <MoneyInput id="efectivo" value={vals.efectivo} onValueChange={set("efectivo")} />
          </Campo>
          <Campo label="Nequis" id="nequis_g">
            <MoneyInput id="nequis_g" value={vals.nequis} onValueChange={set("nequis")} />
          </Campo>
          <Campo label="Monedas" id="monedas">
            <MoneyInput id="monedas" value={vals.monedas} onValueChange={set("monedas")} />
          </Campo>
          <Campo label="Deudas de terceros" id="deudas_terceros">
            <MoneyInput id="deudas_terceros" value={vals.deudas_terceros} onValueChange={set("deudas_terceros")} />
          </Campo>
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5">
          <Label htmlFor="nota_g">Nota (opcional)</Label>
          <Textarea
            id="nota_g"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Observación…"
          />
        </div>
        </CardContent>
      </Card>

      {/* La tarjeta navy: la cifra sobre la que se aprieta Guardar. Mínima: el
          desglose son los campos de al lado. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <TarjetaNavy className="p-[22px]">
          <NavyRotulo>Saldo total</NavyRotulo>
          <AnimatedMoney
            value={total}
            desdeCero={false}
            className={cn(
              "mt-3 block text-display leading-none font-semibold tracking-[-0.8px]",
              total < 0 ? "text-bad-fg" : "text-white",
            )}
          />
          <Button onClick={guardar} disabled={pending} className="mt-6 w-full">
            <FloppyDisk size={18} weight="fill" />
            {pending ? "Guardando…" : existente ? "Guardar cambios" : "Guardar día"}
          </Button>
        </TarjetaNavy>
      </div>
    </div>
  );
}

function Campo({
  label,
  id,
  accion,
  children,
}: {
  label: string;
  id: string;
  /** Acción terciaria a la derecha del rótulo ("Usar $X"). */
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-[12.5px] items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {accion}
      </div>
      {children}
    </div>
  );
}
