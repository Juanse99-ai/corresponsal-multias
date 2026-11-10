import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import {
  getCuadre,
  getConsignacionesLuis,
  getSaldoLuisAcumulado,
  listCuadres,
  getDeudasSaldos,
  resumenPorPersona,
  sumMontos,
} from "@/lib/queries";
import { hoyISO, addDiasISO, formatFechaLarga } from "@/lib/format";
import { saludoHora, mensajePersonal } from "@/lib/saludos";
import { PanelView, type PanelData } from "@/components/panel/panel-view";

export const metadata: Metadata = { title: "Panel · Corresponsal" };

export default async function PanelPage() {
  const profile = await requireSession();
  const hoy = hoyISO();
  const isAdmin = profile.rol === "admin";

  // Saludo según la hora de Colombia.
  const horaBogota = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );

  const ayer = addDiasISO(hoy, -1);
  const [cuadreHoy, consignacionesHoy, saldoLuisAcumulado, recientes, deudas, cuadreAyer, consignacionesAyer] = await Promise.all([
    getCuadre(hoy),
    getConsignacionesLuis(hoy),
    getSaldoLuisAcumulado(hoy, true),
    listCuadres(undefined, undefined, 14),
    isAdmin ? getDeudasSaldos() : Promise.resolve([]),
    // Ayer, para la línea de comparación de la distribución.
    getCuadre(ayer),
    getConsignacionesLuis(ayer),
  ]);

  const srLuisHoy = sumMontos(consignacionesHoy);
  const cuadrados = recientes.filter((c) => Math.round(c.saldo_final) === 0).length;
  const personas = resumenPorPersona(deudas);
  const totalPendiente = personas.reduce((s, p) => s + p.saldo, 0);

  const repartir = (c: typeof cuadreHoy, srLuis: number) =>
    c
      ? [
          { label: "Sr. Luis", value: srLuis },
          { label: "Nequis", value: c.nequis },
          { label: "Bancolombia", value: c.bancolombia },
          { label: "Préstamos", value: c.prestamos_consignaciones },
          { label: "Compensado", value: c.compensado },
          { label: "Retiros", value: c.ret_real },
        ]
      : [];
  const distribucion = repartir(cuadreHoy, srLuisHoy);
  const distribucionAyer = repartir(cuadreAyer, sumMontos(consignacionesAyer));

  const data: PanelData = {
    nombre: profile.nombre,
    saludo: saludoHora(horaBogota),
    mensaje: mensajePersonal(profile.nombre) ?? formatFechaLarga(hoy),
    rol: profile.rol,
    cuadreHoy: cuadreHoy ? { estado: cuadreHoy.estado, saldo_final: cuadreHoy.saldo_final } : null,
    tirillaHoy: cuadreHoy ? cuadreHoy.total_tirilla : 0,
    distribucion,
    distribucionAyer,
    srLuisHoy,
    consignacionesHoyCount: consignacionesHoy.length,
    saldoLuisAcumulado,
    recientes: recientes.map((c) => ({
      fecha: c.fecha,
      saldo_final: c.saldo_final,
      total_tirilla: c.total_tirilla,
      estado: c.estado,
    })),
    stats: { cuadrados, descuadres: recientes.length - cuadrados },
    deudas: isAdmin ? { totalPendiente, personas } : null,
  };

  return <PanelView data={data} />;
}
