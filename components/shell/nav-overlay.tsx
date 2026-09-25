"use client";

import Link from "next/link";
import { CaretRight, X, SignOut, CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivarAvisos } from "@/components/push/activar-avisos";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatCOP, formatFechaLarga, hoyISO } from "@/lib/format";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";
import { NAV, isActive, type NavItem } from "@/components/shell/nav-items";

// Botones de ícono sobre el azul marino del menú.
const navIconBtn =
  "size-11 border border-nav-line bg-transparent text-nav-muted hover:bg-nav-active hover:text-nav-text focus-visible:ring-nav-accent/50";

// Grupos de filas como los ajustes del iPhone, sobre el azul marino.
const grupo = "overflow-hidden rounded-[1.1rem] bg-nav-bg-2";
const fila = "min-h-[3.25rem] gap-3 rounded-none border-0 px-4 py-2.5 text-nav-text";
const tituloGrupo = "mb-2 px-4 text-[0.8rem] font-medium text-nav-faint";

const ROL: Record<Rol, string> = { admin: "Administrador", operador: "Operador" };

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

        {/* Cabecera del panel. */}
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
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

        {/* Cuerpo: secciones a la izquierda, resumen y ajustes a la derecha. */}
        <div className="mx-auto grid w-full max-w-[960px] flex-1 content-start gap-7 px-4 pb-14 pt-2 sm:px-8 grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10 lg:pt-6">
          <nav aria-label="Secciones" className="flex flex-col gap-7">
            <NavBlock label="Principal" items={main} pathname={pathname} onClose={onClose} />
            {isAdmin && admin.length > 0 && (
              <NavBlock label="Administración" items={admin} pathname={pathname} onClose={onClose} />
            )}
          </nav>

          <aside className="flex flex-col gap-7">
            <ResumenPanel resumen={resumen} profile={profile} />
          </aside>
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
    <section>
      <h2 className={tituloGrupo}>{label}</h2>
      <ItemGroup className={grupo}>
        {items.map((item, i) => {
          const active = isActive(pathname, item.href);
          const Icono = item.icon;
          return (
            <div key={item.href}>
              {/* Separador que arranca después del ícono, como en iOS. */}
              {i > 0 && <ItemSeparator className="ml-[3.3rem] bg-nav-line/70 data-[orientation=horizontal]:w-auto" />}
              <Item
                asChild
                className={cn(
                  fila,
                  "focus-visible:ring-nav-accent/50 [a]:hover:bg-nav-active/60",
                  active && "bg-nav-active [a]:hover:bg-nav-active",
                )}
              >
                <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined}>
                  <ItemMedia>
                    <Icono
                      size={22}
                      weight={active ? "fill" : "regular"}
                      className={active ? "text-nav-accent" : "text-nav-muted"}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className={cn("text-[1.0625rem] font-normal", active && "font-semibold")}>
                      {item.label}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <CaretRight size={14} weight="bold" className="text-nav-faint" />
                  </ItemActions>
                </Link>
              </Item>
            </div>
          );
        })}
      </ItemGroup>
    </section>
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
    <>
      <section>
        <h2 className={tituloGrupo}>{formatFechaLarga(hoyISO())}</h2>
        <ItemGroup className={grupo}>
          <Item className={fila}>
            <ItemContent>
              <ItemTitle className="text-[0.95rem] font-normal">Cuadre de hoy</ItemTitle>
            </ItemContent>
            <ItemActions>
              {!c ? (
                <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-nav-accent">
                  <Warning size={16} weight="fill" /> Sin abrir
                </span>
              ) : descuadre ? (
                <span className="tnum inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-[oklch(0.78_0.13_25)]">
                  <Warning size={16} weight="fill" />
                  {c.saldo_final < 0 ? "Sobran " : "Faltan "}
                  {formatCOP(Math.abs(c.saldo_final))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-[oklch(0.8_0.13_155)]">
                  <CheckCircle size={16} weight="fill" /> Cuadrado
                </span>
              )}
            </ItemActions>
          </Item>
          <ItemSeparator className="ml-4 bg-nav-line/70 data-[orientation=horizontal]:w-auto" />
          <Item className={fila}>
            <ItemContent>
              <ItemTitle className="text-[0.95rem] font-normal">Préstamos pendientes</ItemTitle>
            </ItemContent>
            <ItemActions>
              <span className="tnum text-[0.9rem] font-semibold text-nav-text">
                {resumen.prestamosCount > 0 ? formatCOP(resumen.prestamosTotal) : "Ninguno"}
              </span>
            </ItemActions>
          </Item>
        </ItemGroup>
      </section>

      <section>
        <h2 className={tituloGrupo}>Ajustes</h2>
        <ItemGroup className={grupo}>
          <Item className={fila}>
            <ItemContent>
              <ItemTitle className="text-[0.95rem] font-normal">Tema</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ThemeToggle />
            </ItemActions>
          </Item>
          <ItemSeparator className="ml-4 bg-nav-line/70 data-[orientation=horizontal]:w-auto" />
          <Item className={fila}>
            <ItemContent className="gap-0.5">
              <ItemTitle className="text-[0.95rem] font-normal">Avisos</ItemTitle>
              <ItemDescription className="text-[0.78rem] text-nav-faint">Recordatorio para cerrar el día</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ActivarAvisos />
            </ItemActions>
          </Item>
        </ItemGroup>
      </section>

      <ItemGroup className={grupo}>
        <Item className={fila}>
          <ItemMedia>
            <Avatar size="lg">
              <AvatarFallback className="bg-nav-accent/20 text-[0.85rem] font-semibold text-nav-accent">
                {profile.nombre.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </ItemMedia>
          <ItemContent className="min-w-0 gap-0.5">
            <ItemTitle className="w-full truncate text-[0.95rem]">{profile.nombre}</ItemTitle>
            <ItemDescription className="text-[0.78rem] text-nav-faint">{ROL[profile.rol] ?? profile.rol}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <form action={signOutAction}>
              <IconButton type="submit" label="Cerrar sesión" className={navIconBtn}>
                <SignOut size={17} />
              </IconButton>
            </form>
          </ItemActions>
        </Item>
      </ItemGroup>
    </>
  );
}
