"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Wallet } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AreaTendencia } from "@/components/ui/area-chart";
import { HistorialTable } from "./historial-table";
import { LuisHistorialTable } from "./luis-historial-table";
import type { CuadreRow } from "@/lib/database.types";
import type { LuisHistDia } from "@/lib/queries";

type Tab = "cierres" | "luis";

/** Tarjeta de tendencia sobre cada tabla del historial. */
function TendenciaCard({
  titulo,
  subtitulo,
  datos,
  nombre,
}: {
  titulo: string;
  subtitulo: string;
  datos: { fecha: string; valor: number }[];
  nombre: string;
}) {
  if (datos.length < 2) return null;
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-[0.95rem] font-semibold tracking-tight text-text">{titulo}</h3>
      <p className="text-sm text-muted">{subtitulo}</p>
      <div className="mt-4">
        <AreaTendencia datos={datos} nombre={nombre} />
      </div>
    </Card>
  );
}

export function HistorialTabs({ cuadres, luis }: { cuadres: CuadreRow[]; luis: LuisHistDia[] }) {
  const [tab, setTab] = useState<Tab>("cierres");

  // Últimos 60 días con datos, en orden cronológico (las listas vienen DESC).
  const datosTirilla = cuadres
    .slice(0, 60)
    .map((c) => ({ fecha: c.fecha, valor: c.total_tirilla }))
    .reverse();
  const datosLuis = luis
    .slice(0, 60)
    .map((d) => ({ fecha: d.fecha, valor: d.acumulado }))
    .reverse();

  const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
    { id: "cierres", label: "Cierres", icon: Calculator },
    { id: "luis", label: "Sr. Luis", icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-fit rounded-full border border-line bg-surface-2 p-1">
        {tabs.map((t) => {
          const Icono = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.82rem] font-medium transition-colors",
                tab === t.id ? "text-glass-ink" : "text-faint hover:text-muted",
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="hist-tab"
                  className="absolute inset-0 rounded-full lg-glass"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icono size={15} weight="fill" />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "cierres" ? (
        <>
          <TendenciaCard
            titulo="Movimiento del punto"
            subtitulo="Total de la tirilla por día (últimos 60 cierres)"
            datos={datosTirilla}
            nombre="en tirilla"
          />
          <HistorialTable cuadres={cuadres} isAdmin />
        </>
      ) : (
        <>
          <TendenciaCard
            titulo="Cuenta de Sr. Luis"
            subtitulo="Saldo acumulado a su favor, día a día"
            datos={datosLuis}
            nombre="a favor de Luis"
          />
          <LuisHistorialTable dias={luis} />
        </>
      )}
    </div>
  );
}
