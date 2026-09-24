"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, X, SignOut, CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivarAvisos } from "@/components/push/activar-avisos";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatCOP, formatFechaLarga, hoyISO } from "@/lib/format";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { NAV, isActive, type NavItem } from "@/components/shell/nav-items";

const listV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};
const asideV: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.12 } },
};

// Botones de ícono sobre el azul marino del menú.
const navIconBtn =
  "size-11 border border-nav-line bg-transparent text-nav-muted hover:bg-nav-active hover:text-nav-text focus-visible:ring-nav-accent/50";

/** Menú de pantalla completa: <Sheet> de shadcn (ESC, foco atrapado y scroll bloqueado vienen de Radix). */
export function NavOverlay({
  open,
  onClose,
  profile,
  isAdmin,
  pathname,
  resumen,
}: {
  open: boolean;
  onClose: () => void;
  profile: { nombre: string; rol: Rol; email: string };
  isAdmin: boolean;
  pathname: string;
  resumen: HeaderResumen;
}) {
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);
  const main = items.filter((i) => i.grupo === "main");
  const admin = items.filter((i) => i.grupo === "admin");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        // Enfocar el panel y no el botón de cerrar: si no, su tooltip se abre solo
        // y el primer Escape cierra el tooltip en vez del menú.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className="inset-0 z-[60] h-[100dvh] w-full max-w-none gap-0 overflow-y-auto border-0 bg-nav-bg text-nav-text shadow-none sm:max-w-none"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>

        {/* Halo de acento (decorativo). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(48rem 32rem at 85% -8%, oklch(0.74 0.135 258 / 0.22), transparent 60%), radial-gradient(40rem 28rem at -6% 110%, oklch(0.6 0.12 250 / 0.16), transparent 60%)",
          }}
        />

        {/* Cabecera del panel. */}
        <div className="relative flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/panel" onClick={onClose} className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-nav-text">Barrio Centro Sabanalarga 18</p>
              <p className="text-[0.7rem] text-nav-faint">Multidiagnósticos AS</p>
            </div>
          </Link>
          <SheetClose asChild>
            <IconButton label="Cerrar menú" className={navIconBtn}>
              <X size={20} weight="bold" />
            </IconButton>
          </SheetClose>
        </div>

        {/* Cuerpo: links grandes + panel de resumen. */}
        <div className="relative mx-auto grid w-full max-w-[1120px] flex-1 content-start gap-10 px-6 pb-14 pt-4 sm:px-8 lg:grid-cols-[1.45fr_1fr] lg:gap-16 lg:pt-10">
          <motion.nav variants={listV} initial="hidden" animate="show" className="flex flex-col gap-9">
            <NavBlock label="Menú principal" items={main} pathname={pathname} onClose={onClose} />
            {isAdmin && admin.length > 0 && (
              <NavBlock label="Administración" items={admin} pathname={pathname} onClose={onClose} />
            )}
          </motion.nav>

          <motion.aside variants={asideV} initial="hidden" animate="show" className="flex flex-col">
            <ResumenPanel resumen={resumen} profile={profile} />
          </motion.aside>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NavBlock({
  label,
  items,
  pathname,
  onClose,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-nav-faint">{label}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <motion.li key={item.href} variants={itemV}>
              <Link href={item.href} onClick={onClose} className="group flex items-center gap-3 py-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex shrink-0 text-nav-accent transition-all duration-300 ease-out",
                    active
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                >
                  <ArrowRight size={30} weight="bold" />
                </span>
                <span
                  className={cn(
                    "text-[1.9rem] font-semibold leading-none tracking-tight transition-all duration-300 ease-out sm:text-[2.4rem]",
                    active
                      ? "translate-x-0 text-nav-accent"
                      : "-translate-x-[2.6rem] text-nav-text group-hover:translate-x-0 group-hover:text-nav-accent",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function ResumenPanel({
  resumen,
  profile,
}: {
  resumen: HeaderResumen;
  profile: { nombre: string; rol: Rol };
}) {
  const c = resumen.cuadreHoy;
  const descuadre = c ? Math.round(c.saldo_final) !== 0 : false;

  return (
    <div className="flex flex-col gap-4 rounded-[1.4rem] border border-nav-line bg-nav-bg-2/70 p-6 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
      <p className="text-[0.78rem] text-nav-faint">{formatFechaLarga(hoyISO())}</p>

      <div className="flex flex-col gap-3">
        <Separator className="bg-nav-line" />
        {/* Estado del cuadre de hoy. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.82rem] text-nav-muted">Cuadre de hoy</span>
          {!c ? (
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-nav-accent">
              <Warning size={15} weight="fill" /> Sin abrir
            </span>
          ) : descuadre ? (
            <span className="tnum inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[oklch(0.78_0.13_25)]">
              <Warning size={15} weight="fill" />
              {c.saldo_final < 0 ? "Sobran " : "Faltan "}
              {formatCOP(Math.abs(c.saldo_final))}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[oklch(0.8_0.13_155)]">
              <CheckCircle size={15} weight="fill" /> Cuadrado
            </span>
          )}
        </div>

        <Separator className="bg-nav-line" />
        {/* Préstamos pendientes. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.82rem] text-nav-muted">Préstamos pendientes</span>
          <span className="tnum text-[0.82rem] font-semibold text-nav-text">
            {resumen.prestamosCount > 0 ? formatCOP(resumen.prestamosTotal) : "Ninguno"}
          </span>
        </div>
      </div>

      <Separator className="bg-nav-line" />
      {/* Tema claro/oscuro. */}
      <div className="flex items-center justify-between gap-3">
        <div className="leading-tight">
          <p className="text-[0.84rem] font-medium text-nav-text">Tema</p>
          <p className="text-[0.7rem] text-nav-faint">Claro u oscuro</p>
        </div>
        <ThemeToggle />
      </div>

      <Separator className="bg-nav-line" />
      {/* Recordatorios push. */}
      <div className="flex items-center justify-between gap-3">
        <div className="leading-tight">
          <p className="text-[0.84rem] font-medium text-nav-text">Avisos</p>
          <p className="text-[0.7rem] text-nav-faint">Recordatorio para cerrar el día</p>
        </div>
        <ActivarAvisos />
      </div>

      <Separator className="bg-nav-line" />
      {/* Tarjeta de usuario + salir. */}
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-nav-accent/20 text-[0.85rem] font-semibold text-nav-accent">
            {profile.nombre.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.85rem] font-medium text-nav-text">{profile.nombre}</p>
          <p className="text-[0.7rem] capitalize text-nav-faint">{profile.rol}</p>
        </div>
        <form action={signOutAction}>
          <IconButton type="submit" label="Cerrar sesión" className={navIconBtn}>
            <SignOut size={17} />
          </IconButton>
        </form>
      </div>
    </div>
  );
}
