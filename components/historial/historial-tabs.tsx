"use client";

import { useState } from "react";
import { Calculator, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-text">{titulo}</CardTitle>
        <CardDescription>{subtitulo}</CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        <AreaTendencia datos={datos} nombre={nombre} />
      </CardContent>
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
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {tabs.map((t) => {
            const Icono = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id}>
                <Icono weight="fill" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

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
