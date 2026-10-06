import type { Icon } from "@phosphor-icons/react";
import {
  House,
  Calculator,
  Wallet,
  HandCoins,
  ChartLineUp,
  Vault,
  ClockCounterClockwise,
  ArrowsDownUp,
  ShieldCheck,
  Storefront,
  Briefcase,
} from "@phosphor-icons/react/dist/ssr";

export type Grupo = "main" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  grupo: Grupo;
  adminOnly?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/panel", label: "Panel", icon: House, grupo: "main" },
  { href: "/cuadre", label: "Cuadre diario", icon: Calculator, grupo: "main" },
  { href: "/movimientos", label: "Movimientos", icon: ArrowsDownUp, grupo: "main" },
  { href: "/luis", label: "Cuenta del Sr. Luis", icon: Wallet, grupo: "main" },
  { href: "/prestamos", label: "Préstamos", icon: HandCoins, grupo: "main" },
  { href: "/auditoria", label: "Auditoría", icon: ShieldCheck, grupo: "admin", adminOnly: true },
  { href: "/general", label: "Control general", icon: Vault, grupo: "admin", adminOnly: true },
  { href: "/historial", label: "Historial", icon: ChartLineUp, grupo: "admin", adminOnly: true },
  { href: "/bitacora", label: "Bitácora", icon: ClockCounterClockwise, grupo: "admin", adminOnly: true },
];

/** Los grupos del menú: un ícono por grupo en el riel del computador. */
export const GRUPOS: { id: Grupo; label: string; icon: Icon }[] = [
  { id: "main", label: "Principal", icon: Storefront },
  { id: "admin", label: "Administración", icon: Briefcase },
];

/** La sección abierta y su grupo, para la miga de pan sobre el título. */
export function seccionDe(pathname: string): { grupo: string; label: string } | null {
  const item = NAV.find((i) => isActive(pathname, i.href));
  if (!item) return null;
  return { grupo: GRUPOS.find((g) => g.id === item.grupo)?.label ?? "", label: item.label };
}

export function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}
