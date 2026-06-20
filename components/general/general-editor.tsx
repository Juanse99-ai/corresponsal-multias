"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FloppyDisk,
  CheckCircle,
  Warning,
  Plus,
  Minus,
  ArrowClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedMoney } from "@/components/ui/animated-number";
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
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

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
    setToast(null);
    startTransition(async () => {
      const res = await guardarGeneral({ fecha, ...vals, nota: nota.trim() || null });
      if (res.ok) {
        setToast({ ok: true, msg: "Control general guardado." });
        router.refresh();
      } else {
        setToast({ ok: false, msg: res.error ?? "No se pudo guardar." });
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
      <Card className="p-5 sm:p-6">
        <h2 className="text-[0.95rem] font-semibold tracking-tight text-text">Balance del día</h2>
        <p className="text-sm text-muted">El saldo de Luis debe estar respaldado por el cupo, el efectivo y lo prestado a terceros.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Saldo Luis" id="saldo_luis">
            <MoneyInput id="saldo_luis" value={vals.saldo_luis} onValueChange={set("saldo_luis")} />
            {vals.saldo_luis !== saldoLuisSugerido && (
              <button
                type="button"
                onClick={() => set("saldo_luis")(saldoLuisSugerido)}
                className="mt-1 flex items-center gap-1 self-start text-[0.7rem] text-accent-strong hover:underline"
              >
                <ArrowClockwise size={11} />
                Usar saldo del módulo de Luis: {formatCOP(saldoLuisSugerido)}
              </button>
            )}
          </Campo>

          <CampoSigned label="Saldo Cristian" id="saldo_cristian" value={vals.saldo_cristian} onChange={set("saldo_cristian")} />

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
            <p className="mt-1 text-[0.7rem] text-faint">Plata de Luis prestada a terceros (Juan, taller, otros), por cobrar. Resta.</p>
          </Campo>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="nota_g">Nota (opcional)</Label>
          <Textarea
            id="nota_g"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Observación…"
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
        <Card className="relative overflow-hidden border-accent/30 p-6">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-faint">Saldo total</p>
          <p className={cn("mt-2 text-4xl font-semibold tracking-tight", total < 0 ? "text-danger" : "text-text")}>
            <AnimatedMoney value={total} />
          </p>
          <p className="mt-2 text-[0.82rem] text-muted">
            (Luis + Cristian) − (cupo + efectivo + nequis + monedas + deudas de terceros). Debería ser $0.
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <Button onClick={guardar} disabled={pending} className="w-full">
            <FloppyDisk size={18} weight="fill" />
            {pending ? "Guardando…" : existente ? "Guardar cambios" : "Guardar día"}
          </Button>
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "flex items-center gap-2 rounded-[--radius-card] px-3.5 py-2.5 text-[0.82rem]",
                  toast.ok
                    ? "border border-success/30 bg-success-soft text-success"
                    : "border border-danger/30 bg-danger-soft text-danger",
                )}
              >
                {toast.ok ? <CheckCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

function Campo({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function CampoSigned({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const negativo = value < 0;
  const magnitud = Math.abs(value);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="flex rounded-[--radius-card] border border-line-strong bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => onChange(magnitud)}
            className={cn("flex w-9 items-center justify-center rounded-[0.6rem] transition-colors", !negativo ? "bg-elevated text-accent" : "text-faint")}
            title="A favor"
          >
            <Plus size={15} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onChange(-magnitud)}
            className={cn("flex w-9 items-center justify-center rounded-[0.6rem] transition-colors", negativo ? "bg-elevated text-danger" : "text-faint")}
            title="En contra"
          >
            <Minus size={15} weight="bold" />
          </button>
        </div>
        <div className="flex-1">
          <MoneyInput id={id} value={magnitud} onValueChange={(n) => onChange(negativo ? -n : n)} />
        </div>
      </div>
    </div>
  );
}
