"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Desktop, LockKey, Trash, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Item, ItemActions, ItemContent, ItemGroup, ItemSeparator, ItemTitle, ItemDescription } from "@/components/ui/item";
import {
  autorizarEquipo,
  estadoCaja,
  guardarMiClave,
  quitarClave,
  quitarEquipo,
  type EstadoCaja,
} from "@/app/caja/actions";
import { formatFechaHora } from "@/lib/format";

/**
 * Ventana "Clave de caja": cada quien pone o cambia su clave de 6 números; el
 * administrador además autoriza este equipo, ve los equipos autorizados y
 * puede borrarle la clave a quien la olvidó.
 */
export function VentanaClaveCaja({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [estado, setEstado] = useState<EstadoCaja | null>(null);
  const [pending, startTransition] = useTransition();
  const [actual, setActual] = useState("");
  const [clave, setClave] = useState("");
  const [repite, setRepite] = useState("");
  const [nombreEquipo, setNombreEquipo] = useState("Caja");
  const [error, setError] = useState<string | null>(null);

  const cargar = () => estadoCaja().then(setEstado);
  useEffect(() => {
    if (open) void estadoCaja().then(setEstado);
  }, [open]);

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, listo: string, despues?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "No se pudo.");
        return;
      }
      toast.success(listo);
      despues?.();
      await cargar();
    });
  };

  const guardar = () => {
    if (clave !== repite) {
      setError("Las dos claves no son iguales.");
      return;
    }
    correr(() => guardarMiClave(actual, clave), "Clave guardada.", () => {
      setActual("");
      setClave("");
      setRepite("");
    });
  };

  const soloNumeros = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader icono={<LockKey />}>
          <DialogTitle>Clave de caja</DialogTitle>
        </DialogHeader>

        {!estado ? (
          <p className="text-body text-faint">Cargando…</p>
        ) : !estado.listo ? (
          <ErrorNotice
            message={
              estado.esAdmin
                ? "Falta la llave de servicio de Supabase en Vercel (SUPABASE_SERVICE_ROLE_KEY)."
                : "La clave de caja no está activa."
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title font-semibold text-text">Tu clave</h3>
                <Badge variant={estado.tengoClave ? "success" : "secondary"}>
                  {estado.tengoClave ? "Puesta" : "Sin clave"}
                </Badge>
              </div>
              {estado.tengoClave && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clave-actual">Actual</Label>
                  <Input
                    id="clave-actual"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    className="tnum tracking-[0.3em]"
                    value={actual}
                    onChange={(e) => setActual(soloNumeros(e.target.value))}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clave-nueva">{estado.tengoClave ? "Nueva" : "Clave"}</Label>
                  <Input
                    id="clave-nueva"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="6 números"
                    className="tnum tracking-[0.3em]"
                    value={clave}
                    onChange={(e) => setClave(soloNumeros(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clave-repite">Repite</Label>
                  <Input
                    id="clave-repite"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    className="tnum tracking-[0.3em]"
                    value={repite}
                    onChange={(e) => setRepite(soloNumeros(e.target.value))}
                  />
                </div>
              </div>
              <Button
                onClick={guardar}
                disabled={pending || clave.length !== 6 || repite.length !== 6 || (estado.tengoClave && actual.length !== 6)}
              >
                <LockKey weight="bold" />
                Guardar clave
              </Button>
            </section>

            <ErrorNotice message={error} />

            {estado.esAdmin && (
              <>
                <section className="flex flex-col gap-3 border-t border-line pt-4">
                  <h3 className="text-title font-semibold text-text">Este equipo</h3>
                  {estado.equipo ? (
                    <div className="flex items-center gap-3">
                      <Desktop size={20} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{estado.equipo}</span>
                      <Badge variant="success">Autorizado</Badge>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <Label htmlFor="nombre-equipo">Nombre</Label>
                        <Input
                          id="nombre-equipo"
                          value={nombreEquipo}
                          maxLength={40}
                          onChange={(e) => setNombreEquipo(e.target.value)}
                        />
                      </div>
                      <Button onClick={() => correr(() => autorizarEquipo(nombreEquipo), "Equipo autorizado.")} disabled={pending}>
                        Autorizar
                      </Button>
                    </div>
                  )}
                  {(estado.equipos?.length ?? 0) > 0 && (
                    <ItemGroup variant="cajitas">
                      {estado.equipos!.map((e, i) => (
                        <div key={e.id} className="contents">
                          {i > 0 && <ItemSeparator />}
                          <Item size="sm" className="flex-nowrap px-0 py-2 lg:px-3">
                            <ItemContent className="min-w-0 gap-0">
                              <ItemTitle className="truncate text-body font-medium">
                                {e.nombre}
                                {e.actual ? " (este)" : ""}
                              </ItemTitle>
                              <ItemDescription className="text-meta">
                                {e.ultimoUso ? `Usado ${formatFechaHora(e.ultimoUso)}` : "Sin uso"}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <IconButton
                                label={`Quitar ${e.nombre}`}
                                peligro
                                onClick={() => correr(() => quitarEquipo(e.id), "Equipo quitado.")}
                                disabled={pending}
                              >
                                <Trash size={16} />
                              </IconButton>
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  )}
                </section>

                <section className="flex flex-col gap-2 border-t border-line pt-4">
                  <h3 className="text-title font-semibold text-text">Personas</h3>
                  <ItemGroup variant="cajitas">
                    {(estado.personas ?? []).map((p, i) => (
                      <div key={p.id} className="contents">
                        {i > 0 && <ItemSeparator />}
                        <Item size="sm" className="flex-nowrap px-0 py-2 lg:px-3">
                          <UserCircle size={20} className="shrink-0 text-muted" />
                          <ItemContent className="min-w-0">
                            <ItemTitle className="truncate text-body font-medium">{p.nombre}</ItemTitle>
                          </ItemContent>
                          <ItemActions className="gap-2">
                            {p.bloqueadaMin < 0 ? (
                              <Badge variant="danger">Bloqueada</Badge>
                            ) : p.bloqueadaMin > 0 ? (
                              <Badge variant="danger">Bloqueada {p.bloqueadaMin} min</Badge>
                            ) : (
                              <Badge variant={p.tieneClave ? "success" : "secondary"}>
                                {p.tieneClave ? "Con clave" : "Sin clave"}
                              </Badge>
                            )}
                            {p.tieneClave && (
                              <IconButton
                                label={`Borrar la clave de ${p.nombre}`}
                                peligro
                                onClick={() => correr(() => quitarClave(p.id), "Clave borrada.")}
                                disabled={pending}
                              >
                                <Trash size={16} />
                              </IconButton>
                            )}
                          </ItemActions>
                        </Item>
                      </div>
                    ))}
                  </ItemGroup>
                </section>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
