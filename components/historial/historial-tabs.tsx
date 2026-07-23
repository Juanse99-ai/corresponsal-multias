"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Wallet } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { HistorialTable } from "./historial-table";
import { LuisHistorialTable } from "./luis-historial-table";
import type { CuadreRow } from "@/lib/database.types";
import type { LuisHistDia } from "@/lib/queries";

type Tab = "cierres" | "luis";

export function HistorialTabs({ cuadres, luis }: { cuadres: CuadreRow[]; luis: LuisHistDia[] }) {
  const [tab, setTab] = useState<Tab>("cierres");

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
        <HistorialTable cuadres={cuadres} isAdmin />
      ) : (
        <LuisHistorialTable dias={luis} />
      )}
    </div>
  );
}
