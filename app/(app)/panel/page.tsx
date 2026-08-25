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
import { hoyISO } from "@/lib/format";
import { saludoHora, mensajePersonal } from "@/lib/saludos";
import { PanelView, type PanelData } from "@/components/panel/panel-view";

export const metadata: Metadata = { title: "Panel · Corresponsal" };

export default async function PanelPage() {
  const profile = await requireSession();
  const hoy = hoyISO();
  const isAdmin = profile.rol === "admin";

  // Saludo y mensaje del día en hora de Colombia (uno por día, estable).
  const ahora = new Date();
  const fechaBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const horaBogota = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(ahora),
  );

  const [cuadreHoy, consignacionesHoy, saldoLuisAcumulado, recientes, deudas] = await Promise.all([
    getCuadre(hoy),
    getConsignacionesLuis(hoy),
    getSaldoLuisAcumulado(hoy, true),
    listCuadres(undefined, undefined, 14),
    isAdmin ? getDeudasSaldos() : Promise.resolve([]),
  ]);

  const srLuisHoy = sumMontos(consignacionesHoy);
  const cuadrados = recientes.filter((c) => Math.round(c.saldo_final) === 0).length;
  const personas = resumenPorPersona(deudas);
  const totalPendiente = personas.reduce((s, p) => s + p.saldo, 0);

  const distribucion = cuadreHoy
    ? [
        { label: "Sr. Luis", value: srLuisHoy },
        { label: "Efectivo", value: cuadreHoy.efectivo_consignaciones + cuadreHoy.retiros_cash },
        { label: "Nequis", value: cuadreHoy.nequis },
        { label: "Bancolombia", value: cuadreHoy.bancolombia },
        { label: "Préstamos", value: cuadreHoy.prestamos_consignaciones },
        { label: "Compensado", value: cuadreHoy.compensado },
        { label: "Retiros", value: cuadreHoy.ret_real },
      ]
    : [];

  const data: PanelData = {
    nombre: profile.nombre,
    saludo: saludoHora(horaBogota),
    mensaje: mensajePersonal(profile.nombre, fechaBogota),
    rol: profile.rol,
    cuadreHoy: cuadreHoy ? { estado: cuadreHoy.estado, saldo_final: cuadreHoy.saldo_final } : null,
    tirillaHoy: cuadreHoy ? cuadreHoy.total_tirilla : 0,
    distribucion,
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
