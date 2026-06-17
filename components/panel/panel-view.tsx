"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Calculator,
  Wallet,
  ArrowRight,
  CheckCircle,
  Warning,
  HandCoins,
  Plus,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedMoney } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { formatCOP, formatFechaCorta } from "@/lib/format";
import type { Rol } from "@/lib/cuadre";
import type { PersonaSaldo } from "@/lib/queries";

interface Reciente {
  fecha: string;
  saldo_final: number;
  total_tirilla: number;
  estado: string;
}

export interface PanelData {
  nombre: string;
  rol: Rol;
  cuadreHoy: { estado: string; saldo_final: number } | null;
  srLuisHoy: number;
  consignacionesHoyCount: number;
  saldoLuisAcumulado: number;
  recientes: Reciente[];
  stats: { cuadrados: number; descuadres: number };
  deudas: { totalPendiente: number; personas: PersonaSaldo[] } | null;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 130, damping: 20 } },
};

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function PanelView({ data }: { data: PanelData }) {
  const primer = data.nombre.split(/\s+/)[0];
  const descuadreHoy = data.cuadreHoy && Math.round(data.cuadreHoy.saldo_final) !== 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.8rem]">
          {saludo()}, {primer}.
        </h1>
        <p className="mt-1 text-sm text-muted">Así va el corresponsal hoy.</p>
      </motion.div>

      {/* Fila principal */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <motion.div variants={item}>
          <Link href="/cuadre" className="group block h-full">
            <Card
              className={cn(
                "relative h-full overflow-hidden p-6 transition-colors",
                data.cuadreHoy ? (descuadreHoy ? "border-danger/40" : "border-success/40") : "hover:border-line-strong",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl",
                  data.cuadreHoy ? (descuadreHoy ? "bg-danger/15" : "bg-success/15") : "bg-accent/10",
                )}
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted">
                    <Calculator size={18} weight="fill" className="text-accent" />
                    <span className="text-[0.82rem] font-medium">Cuadre de hoy</span>
                  </div>
                  {data.cuadreHoy ? (
                    <Badge tone={descuadreHoy ? "danger" : "success"}>
                      {descuadreHoy ? <Warning size={11} weight="fill" /> : <CheckCircle size={11} weight="fill" />}
                      {descuadreHoy ? "Descuadre" : "Cuadrado"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Sin abrir</Badge>
                  )}
                </div>

                <div className="mt-8">
                  {data.cuadreHoy ? (
                    <>
                      <p className="text-[0.74rem] uppercase tracking-wide text-faint">Saldo final</p>
                      <p
                        className={cn(
                          "mt-1 text-4xl font-semibold tracking-tight",
                          descuadreHoy ? "text-danger" : "text-success",
                        )}
                      >
                        <AnimatedMoney value={data.cuadreHoy.saldo_final} />
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-semibold tracking-tight text-text">Aún sin cuadrar</p>
                      <p className="mt-1 text-sm text-muted">Abre el cuadre cuando tengas la tirilla.</p>
                    </>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-1.5 pt-6 text-[0.82rem] font-medium text-accent-strong">
                  {data.cuadreHoy ? "Ver cuadre" : "Abrir cuadre"}
                  <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/luis" className="group block h-full">
            <Card className="relative h-full overflow-hidden p-6 transition-colors hover:border-line-strong">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center gap-2 text-muted">
                  <Wallet size={18} weight="fill" className="text-accent" />
                  <span className="text-[0.82rem] font-medium">Cupo de Luis hoy</span>
                </div>
                <div className="mt-8">
                  <p className="text-[0.74rem] uppercase tracking-wide text-faint">Consignado hoy</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-text">
                    <AnimatedMoney value={data.srLuisHoy} />
                  </p>
                  <p className="mt-2 text-[0.82rem] text-muted">
                    {data.consignacionesHoyCount} consignación{data.consignacionesHoyCount === 1 ? "" : "es"} · saldo
                    de Luis <span className="tnum text-text">{formatCOP(data.saldoLuisAcumulado)}</span>
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 pt-6 text-[0.82rem] font-medium text-accent-strong">
                  Registrar consignación
                  <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Fila secundaria */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted">
                <TrendUp size={18} weight="fill" className="text-accent" />
                <span className="text-[0.82rem] font-medium">Últimos cierres</span>
              </div>
              <div className="flex items-center gap-3 text-[0.74rem]">
                <span className="flex items-center gap-1 text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {data.stats.cuadrados}
                </span>
                <span className="flex items-center gap-1 text-danger">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  {data.stats.descuadres}
                </span>
              </div>
            </div>
            {data.recientes.length === 0 ? (
              <p className="mt-8 text-sm text-muted">Todavía no hay cierres registrados.</p>
            ) : (
              <RecientesChart recientes={data.recientes} />
            )}
          </Card>
        </motion.div>

        <motion.div variants={item}>
          {data.deudas ? (
            <Card className="h-full p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted">
                  <HandCoins size={18} weight="fill" className="text-accent" />
                  <span className="text-[0.82rem] font-medium">Préstamos</span>
                </div>
                <Link href="/prestamos" className="text-faint transition-colors hover:text-accent-strong">
                  <ArrowRight size={16} />
                </Link>
              </div>
              <p className="mt-6 text-[0.74rem] uppercase tracking-wide text-faint">Total pendiente</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-text">
                <AnimatedMoney value={data.deudas.totalPendiente} />
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                {data.deudas.personas.filter((p) => p.saldo > 0).slice(0, 4).map((p) => (
                  <div key={p.persona} className="flex items-center justify-between text-[0.82rem]">
                    <span className="text-muted">{p.persona}</span>
                    <span className="tnum text-text">{formatCOP(p.saldo)}</span>
                  </div>
                ))}
                {data.deudas.personas.filter((p) => p.saldo > 0).length === 0 && (
                  <p className="text-[0.82rem] text-success">Nadie debe al fondo.</p>
                )}
              </div>
            </Card>
          ) : (
            <Link href="/prestamos" className="group block h-full">
              <Card className="flex h-full flex-col justify-between p-6 transition-colors hover:border-line-strong">
                <div className="flex items-center gap-2 text-muted">
                  <HandCoins size={18} weight="fill" className="text-accent" />
                  <span className="text-[0.82rem] font-medium">Préstamos</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-text">Registrar un préstamo</p>
                  <p className="mt-1 text-sm text-muted">Anota quién tomó plata del fondo.</p>
                </div>
                <div className="flex items-center gap-1.5 text-[0.82rem] font-medium text-accent-strong">
                  <Plus size={15} weight="bold" />
                  Nuevo préstamo
                </div>
              </Card>
            </Link>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function RecientesChart({ recientes }: { recientes: Reciente[] }) {
  const orden = [...recientes].reverse(); // antiguo -> reciente
  const max = Math.max(...orden.map((r) => r.total_tirilla), 1);

  return (
    <div>
      <div className="mt-6 flex h-28 items-end gap-1.5">
        {orden.map((r) => {
          const descuadre = Math.round(r.saldo_final) !== 0;
          const h = Math.max(8, (r.total_tirilla / max) * 100);
          return (
            <Link
              key={r.fecha}
              href={`/cuadre?fecha=${r.fecha}`}
              className="group/bar relative flex flex-1 flex-col items-center justify-end"
              title={`${formatFechaCorta(r.fecha)} · ${formatCOP(r.total_tirilla)}`}
            >
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 }}
                className={cn(
                  "w-full rounded-md transition-opacity group-hover/bar:opacity-100",
                  descuadre ? "bg-danger/70" : "bg-success/60",
                )}
              />
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.66rem] text-faint">
        <span>{formatFechaCorta(orden[0].fecha)}</span>
        <span>{formatFechaCorta(orden[orden.length - 1].fecha)}</span>
      </div>
    </div>
  );
}
