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
import { formatFechaLarga, hoyISO } from "@/lib/format";
import type { Rol } from "@/lib/cuadre";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: Icon;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/panel", label: "Panel", short: "Panel", icon: House },
  { href: "/cuadre", label: "Cuadre diario", short: "Cuadre", icon: Calculator },
  { href: "/movimientos", label: "Movimientos", short: "Movs", icon: ArrowsDownUp },
  { href: "/luis", label: "Cupo de Luis", short: "Luis", icon: Wallet },
  { href: "/prestamos", label: "Préstamos", short: "Préstamos", icon: HandCoins },
  { href: "/general", label: "Control general", short: "General", icon: Vault, adminOnly: true },
  { href: "/historial", label: "Historial", short: "Historial", icon: ChartLineUp, adminOnly: true },
  { href: "/bitacora", label: "Bitácora", short: "Bitácora", icon: ClockCounterClockwise, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

const drawerNav: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};
const drawerItem: Variants = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

export function AppShell({
  profile,
  children,
}: {
  profile: { nombre: string; rol: Rol; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV.filter((i) => !i.adminOnly || profile.rol === "admin");

  return (
    <div className="min-h-[100dvh]">
      {/* ===== Riel lateral escritorio (azul marino, colapsable) ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-nav-bg text-nav-text lg:flex",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed && "lg:-translate-x-[110%]",
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <Link href="/panel" className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-none">
              <p className="text-sm font-semibold tracking-tight text-nav-text">Corresponsal</p>
              <p className="text-[0.7rem] text-nav-faint">Multidiagnósticos AS</p>
            </div>
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            title="Ocultar menú"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-nav-faint transition-colors hover:bg-nav-active hover:text-nav-text"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
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
            className="fixed left-4 top-4 z-40 hidden h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-surface text-text shadow-[0_10px_28px_-12px_oklch(0.4_0.07_258/0.4)] lg:flex"
          >
            <Hamburger open={false} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== Barra superior móvil (clara) ===== */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-3 py-3 backdrop-blur-xl lg:hidden">
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
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <SignOut size={18} />
          </button>
        </form>
      </header>

      {/* ===== Drawer lateral móvil (azul marino) ===== */}
      <AnimatePresence>
        {menuOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-[oklch(0.2_0.04_260/0.5)] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-[300px] flex-col bg-nav-bg text-nav-text"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Link href="/panel" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
                  <Logo size={32} />
                  <div className="leading-none">
                    <p className="text-sm font-semibold tracking-tight text-nav-text">Corresponsal</p>
                    <p className="text-[0.7rem] text-nav-faint">Multidiagnósticos AS</p>
                  </div>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-nav-text hover:bg-nav-active"
                >
                  <Hamburger open />
                </button>
              </div>

              <motion.nav variants={drawerNav} initial="hidden" animate="show" className="flex flex-1 flex-col gap-1 px-3">
                {items.map((item) => (
                  <motion.div key={item.href} variants={drawerItem}>
                    <NavLink item={item} active={isActive(pathname, item.href)} onClick={() => setMenuOpen(false)} />
                  </motion.div>
                ))}
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
          collapsed ? "lg:pl-0" : "lg:pl-[260px]",
        )}
      >
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8">
          <p className="mb-1 text-[0.78rem] text-faint">{formatFechaLarga(hoyISO())}</p>
          {children}
        </div>
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
        "group relative flex items-center gap-3 rounded-[--radius-card] px-3.5 py-2.5 text-sm transition-colors",
        active ? "text-nav-text" : "text-nav-muted hover:text-nav-text",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-[--radius-card] bg-nav-active"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon
        size={19}
        weight={active ? "fill" : "regular"}
        className={cn("relative z-10", active ? "text-nav-accent" : "text-nav-faint group-hover:text-nav-muted")}
      />
      <span className="relative z-10 font-medium">{item.label}</span>
    </Link>
  );
}

function UserCard({ profile }: { profile: { nombre: string; rol: Rol } }) {
  return (
    <div className="border-t border-nav-line p-3">
      <div className="flex items-center gap-3 rounded-[--radius-card] px-3 py-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nav-accent/25 text-[0.8rem] font-semibold text-nav-accent">
          {profile.nombre.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.82rem] font-medium text-nav-text">{profile.nombre}</p>
          <p className="text-[0.7rem] capitalize text-nav-faint">{profile.rol}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-nav-faint transition-colors hover:bg-nav-active hover:text-danger"
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
      <motion.span
        className="h-0.5 w-6 rounded-full bg-current"
        animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={spring}
      />
      <motion.span
        className="h-0.5 w-6 rounded-full bg-current"
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className="h-0.5 w-6 rounded-full bg-current"
        animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={spring}
      />
    </div>
  );
}
