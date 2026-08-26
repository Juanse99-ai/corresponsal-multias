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
  { href: "/luis", label: "Cuenta de Sr. Luis", icon: Wallet, grupo: "main" },
  { href: "/prestamos", label: "Préstamos", icon: HandCoins, grupo: "main" },
  { href: "/general", label: "Control general", icon: Vault, grupo: "admin", adminOnly: true },
  { href: "/historial", label: "Historial", icon: ChartLineUp, grupo: "admin", adminOnly: true },
  { href: "/bitacora", label: "Bitácora", icon: ClockCounterClockwise, grupo: "admin", adminOnly: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}
