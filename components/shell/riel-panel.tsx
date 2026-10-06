"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, SidebarSimple, SignOut, Sun } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActivarAvisos } from "@/components/push/activar-avisos";
import { HeaderSearch, buildAvisos } from "@/components/shell/top-header";
import { GRUPOS, NAV, isActive, type Grupo } from "@/components/shell/nav-items";
import { signOutAction } from "@/app/login/actions";
import { useMontado } from "@/lib/use-montado";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/cuadre";
import type { HeaderResumen } from "@/lib/queries";

const ROL: Record<Rol, string> = { admin: "Administrador", operador: "Operador" };

// Botón redondo del riel (40 px); el grupo elegido es un círculo azul.
const rielBtn = "size-10 rounded-full text-muted hover:bg-[var(--menu-hover)] hover:text-text";
const rielOn = "bg-primary text-primary-foreground shadow-[var(--primario-sombra)] hover:bg-primary hover:text-primary-foreground";

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Menú del computador (estilo del taller): un riel de íconos, uno por grupo,
 * y al lado el panel con las secciones del grupo, el buscador y quién entró.
 * El tema, las iniciales (con los ajustes) y el botón que esconde el panel
 * viven al pie del riel. Las rutas y lo que ve cada rol son los mismos del
 * menú del celular (NAV).
 */
export function RielPanel({
  profile,
  isAdmin,
  pathname,
  resumen,
}: {
  profile: { nombre: string; rol: Rol; email: string };
  isAdmin: boolean;
  pathname: string;
  resumen: HeaderResumen;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();
  const noche = montado && resolvedTheme === "dark";
  // El grupo que se ve en el panel (null: el de la sección abierta).
  const [visto, setVisto] = useState<Grupo | null>(null);
  const [escondido, setEscondido] = useState(false);

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);
  const grupos = GRUPOS.map((g) => ({ ...g, items: items.filter((i) => i.grupo === g.id) })).filter(
    (g) => g.items.length > 0,
  );
  const delActivo = grupos.find((g) => g.items.some((i) => isActive(pathname, i.href)));
  const grupo = grupos.find((g) => g.id === visto) ?? delActivo ?? grupos[0];

  // Punto rojo en el ícono de un grupo escondido que tiene algo urgente.
  const urgentes = useMemo(
    () => buildAvisos(resumen).filter((a) => a.tone === "danger" || a.tone === "warn").map((a) => a.href),
    [resumen],
  );
  const contador: Record<string, number> = { "/prestamos": resumen.prestamosCount };

  return (
    <aside className="sticky top-6 hidden h-[calc(100dvh-48px)] shrink-0 gap-2.5 lg:flex" aria-label="Menú">
      <div className="flex w-[50px] flex-none flex-col items-center gap-1.5 pt-1 pb-1.5">
        <Link href="/panel" aria-label="Inicio" className="mb-3.5 rounded-xl shadow-[0_1px_2px_rgba(20,16,50,0.08),0_6px_14px_-8px_rgba(20,16,50,0.35)]">
          <Logo size={40} className="rounded-xl" />
        </Link>

        <nav aria-label="Grupos" className="flex flex-col gap-1.5">
          {grupos.map((g) => {
            const Icono = g.icon;
            const on = g.id === grupo?.id;
            const punto = !on && g.items.some((i) => urgentes.includes(i.href));
            return (
              <IconButton
                forma="suelto"
                key={g.id}
                label={g.label}
                tooltipSide="right"
                aria-current={g.id === delActivo?.id ? "true" : undefined}
                className={cn(rielBtn, "relative", on && rielOn)}
                onClick={() => {
                  setVisto(g.id);
                  if (escondido) setEscondido(false);
                  if (g.id !== delActivo?.id) router.push(g.items[0].href);
                }}
              >
                <Icono size={19} weight={on ? "fill" : "regular"} />
                {punto && (
                  <span aria-hidden className="absolute top-[7px] right-[7px] size-2 rounded-full bg-danger ring-2 ring-[#e8edf6] dark:ring-[#08080a]" />
                )}
              </IconButton>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2">
          <IconButton
            forma="suelto"
            label={noche ? "Tema Azul" : "Tema Noche"}
            tooltipSide="right"
            className={rielBtn}
            onClick={() => setTheme(noche ? "light" : "dark")}
          >
            {noche ? <Sun size={19} /> : <Moon size={19} />}
          </IconButton>

          <Popover>
            <PopoverTrigger asChild>
              <IconButton forma="suelto" label={`${profile.nombre}, ${ROL[profile.rol] ?? profile.rol}`} tooltipSide="right" className="size-10 rounded-full p-0 hover:bg-transparent">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-meta font-semibold text-primary-foreground">
                    {iniciales(profile.nombre)}
                  </AvatarFallback>
                </Avatar>
              </IconButton>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" sideOffset={10} className="w-72 overflow-hidden p-0">
              <ItemGroup>
                <Item size="sm" className="rounded-none border-0">
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="w-full truncate text-title font-semibold text-text">{profile.nombre}</ItemTitle>
                    <ItemDescription className="text-meta text-faint">{ROL[profile.rol] ?? profile.rol}</ItemDescription>
                  </ItemContent>
                </Item>
                <ItemSeparator className="bg-line" />
                <Item size="sm" className="rounded-none border-0">
                  <ItemContent className="gap-0.5">
                    <ItemTitle className="text-title font-medium text-text">Avisos</ItemTitle>
                    <ItemDescription className="text-meta text-faint">Recordatorio para cerrar el día</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ActivarAvisos sobre="claro" />
                  </ItemActions>
                </Item>
                <ItemSeparator className="bg-line" />
                <form action={signOutAction}>
                  <Item size="sm" asChild className="w-full rounded-none border-0">
                    <Button type="submit" variant="ghost" className="h-11 justify-start rounded-none font-normal text-text hover:bg-fill active:scale-100">
                      <ItemMedia>
                        <SignOut size={17} />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-title font-medium">Cerrar sesión</ItemTitle>
                      </ItemContent>
                    </Button>
                  </Item>
                </form>
              </ItemGroup>
            </PopoverContent>
          </Popover>

          <IconButton
            forma="suelto"
            label={escondido ? "Mostrar el panel" : "Esconder el panel"}
            tooltipSide="right"
            className={rielBtn}
            onClick={() => setEscondido((v) => !v)}
          >
            <SidebarSimple size={19} />
          </IconButton>
        </div>
      </div>

      {!escondido && grupo && (
        <div
          key={grupo.id}
          className="panel-entra flex w-[240px] flex-none flex-col rounded-[20px] border border-[var(--tarjeta-borde)] bg-panel px-2 pt-3.5 pb-2.5 shadow-[var(--tarjeta-sombra)]"
        >
          <h2 className="px-2 pb-3 text-lead font-semibold tracking-[-0.3px] text-text">{grupo.label}</h2>
          <HeaderSearch enPanel personas={isAdmin ? resumen.personas : []} />

          <nav aria-label={grupo.label} className="flex flex-1 flex-col gap-0.5">
            {grupo.items.map((item) => {
              const activo = isActive(pathname, item.href);
              const Icono = item.icon;
              const n = contador[item.href] ?? 0;
              return (
                <Item
                  key={item.href}
                  asChild
                  className={cn(
                    "h-[38px] flex-nowrap gap-2.5 rounded-xl border-0 px-2.5 py-0 text-body font-medium text-text [a]:hover:bg-[var(--menu-hover)]",
                    activo && "bg-blanco font-semibold shadow-[var(--pastilla-sombra)] [a]:hover:bg-blanco",
                  )}
                >
                  <Link href={item.href} aria-current={activo ? "page" : undefined}>
                    <ItemMedia>
                      <Icono size={18} weight={activo ? "fill" : "regular"} className={activo ? "text-text" : "text-muted"} />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className={cn("truncate", activo ? "font-semibold" : "font-medium")}>{item.label}</ItemTitle>
                    </ItemContent>
                    {n > 0 && (
                      <ItemActions>
                        <span className="tnum text-meta font-medium text-faint">{n}</span>
                      </ItemActions>
                    )}
                  </Link>
                </Item>
              );
            })}
          </nav>

          <div className="border-t border-line px-2 pt-2.5">
            <p className="truncate text-body font-semibold text-text">{profile.nombre}</p>
            <p className="text-meta text-faint">{ROL[profile.rol] ?? profile.rol}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
