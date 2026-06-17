"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  House,
  Calculator,
  Wallet,
  HandCoins,
  ChartLineUp,
  Vault,
  ClockCounterClockwise,
  ArrowsDownUp,
  SignOut,
  CaretLeft,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Logo } from "@/components/brand";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { TopHeader, HeaderAvisos, buildAvisos, avisosUrgentes } from "@/components/shell/top-header";

type Grupo = "main" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  grupo: Grupo;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/panel", label: "Panel", icon: House, grupo: "main" },
  { href: "/cuadre", label: "Cuadre diario", icon: Calculator, grupo: "main" },
  { href: "/movimientos", label: "Movimientos", icon: ArrowsDownUp, grupo: "main" },
  { href: "/luis", label: "Cupo de Luis", icon: Wallet, grupo: "main" },
  { href: "/prestamos", label: "Préstamos", icon: HandCoins, grupo: "main" },
  { href: "/general", label: "Control general", icon: Vault, grupo: "admin", adminOnly: true },
  { href: "/historial", label: "Historial", icon: ChartLineUp, grupo: "admin", adminOnly: true },
  { href: "/bitacora", label: "Bitácora", icon: ClockCounterClockwise, grupo: "admin", adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

const drawerNav: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
};
const drawerItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

export function AppShell({
  profile,
  resumen,
  children,
}: {
  profile: { nombre: string; rol: Rol; email: string };
  resumen: HeaderResumen;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = profile.rol === "admin";
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);
  const avisos = buildAvisos(resumen);

  return (
    <div className="min-h-[100dvh]">
      {/* ===== Riel lateral escritorio (claro, colapsable) ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed && "lg:-translate-x-[110%]",
        )}
      >
        <div className="flex items-center justify-between px-5 py-[1.35rem]">
          <Link href="/panel" className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-text">Corresponsal</p>
              <p className="text-[0.7rem] text-faint">Multidiagnósticos AS</p>
            </div>
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            title="Ocultar menú"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-text"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3.5 pb-4">
          <NavGroup label="Menú principal" items={items.filter((i) => i.grupo === "main")} pathname={pathname} />
          {isAdmin && (
            <NavGroup label="Administración" items={items.filter((i) => i.grupo === "admin")} pathname={pathname} />
          )}
        </nav>

        <UserCard profile={profile} />
      </aside>

      {/* Botón flotante para reabrir el menú en escritorio */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -10 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            onClick={() => setCollapsed(false)}
            title="Mostrar menú"
            className="fixed left-4 top-4 z-40 hidden h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-text shadow-[0_10px_28px_-12px_oklch(0.4_0.07_258/0.4)] lg:flex"
          >
            <Hamburger open={false} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== Barra superior móvil ===== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-bg/85 px-3 py-2.5 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface-2"
        >
          <Hamburger open={menuOpen} />
        </button>
        <Link href="/panel" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold tracking-tight text-text">Corresponsal</span>
        </Link>
        <HeaderAvisos avisos={avisos} urgentes={avisosUrgentes(avisos)} />
      </header>

      {/* ===== Drawer lateral móvil (claro) ===== */}
      <AnimatePresence>
        {menuOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-[oklch(0.3_0.03_258/0.35)] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px] flex-col border-r border-line bg-surface"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Link href="/panel" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
                  <Logo size={32} />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold tracking-tight text-text">Corresponsal</p>
                    <p className="text-[0.7rem] text-faint">Multidiagnósticos AS</p>
                  </div>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text hover:bg-surface-2"
                >
                  <Hamburger open />
                </button>
              </div>

              <motion.nav variants={drawerNav} initial="hidden" animate="show" className="flex-1 overflow-y-auto px-3.5">
                <NavGroup label="Menú principal" items={items.filter((i) => i.grupo === "main")} pathname={pathname} onNavigate={() => setMenuOpen(false)} animated />
                {isAdmin && (
                  <NavGroup label="Administración" items={items.filter((i) => i.grupo === "admin")} pathname={pathname} onNavigate={() => setMenuOpen(false)} animated />
                )}
              </motion.nav>

              <UserCard profile={profile} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ===== Contenido ===== */}
      <div
        className={cn(
          "transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "lg:pl-0" : "lg:pl-[248px]",
        )}
      >
        <TopHeader resumen={resumen} isAdmin={isAdmin} />
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-7">
          {children}
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
  animated,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  animated?: boolean;
}) {
  return (
    <div className="mb-1">
      <p className="px-2 pb-1.5 pt-4 text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-faint">{label}</p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const link = <NavLink item={item} active={isActive(pathname, item.href)} onClick={onNavigate} />;
          return animated ? (
            <motion.div key={item.href} variants={drawerItem}>
              {link}
            </motion.div>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
      </div>
    </div>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-[0.7rem] px-3 py-2.5 text-[0.85rem] font-medium transition-colors",
        active ? "text-white" : "text-muted hover:text-text",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-[0.7rem] bg-accent shadow-[0_8px_16px_-10px_oklch(0.515_0.172_258/0.75)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon
        size={18}
        weight={active ? "fill" : "regular"}
        className={cn("relative z-10", active ? "text-white" : "text-faint group-hover:text-muted")}
      />
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

function UserCard({ profile }: { profile: { nombre: string; rol: Rol } }) {
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-[0.8rem] px-2.5 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-[0.8rem] font-semibold text-accent-strong">
          {profile.nombre.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.82rem] font-medium text-text">{profile.nombre}</p>
          <p className="text-[0.7rem] capitalize text-faint">{profile.rol}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <SignOut size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function Hamburger({ open }: { open: boolean }) {
  const spring = { type: "spring", stiffness: 400, damping: 28 } as const;
  return (
    <div className="flex h-6 w-6 flex-col items-center justify-center gap-[5px]">
      <motion.span className="h-0.5 w-6 rounded-full bg-current" animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} transition={spring} />
      <motion.span className="h-0.5 w-6 rounded-full bg-current" animate={open ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.15 }} />
      <motion.span className="h-0.5 w-6 rounded-full bg-current" animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} transition={spring} />
    </div>
  );
}
