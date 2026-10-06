"use client";

import { useEffect, useState } from "react";
import { BellRinging, BellSlash } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "working";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Cómo están los avisos en este navegador. Es asíncrono porque la suscripción se
 *  le pide al service worker; el botón muestra "…" mientras tanto. */
async function estadoInicial(): Promise<State> {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

/** Botón para activar/desactivar las notificaciones push (recordatorios). */
/** `sobre="claro"`: fuera del menú azul marino (ajustes del riel en el computador). */
export function ActivarAvisos({ sobre = "menu" }: { sobre?: "menu" | "claro" }) {
  const claro = sobre === "claro";
  const tenue = claro ? "text-faint" : "text-nav-faint";
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let vigente = true;
    estadoInicial().then((s) => {
      if (vigente) setState(s);
    });
    return () => {
      vigente = false;
    };
  }, []);

  async function activar() {
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function desactivar() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "loading")
    return <span className={cn("text-[0.72rem]", tenue)}>…</span>;
  if (state === "unsupported")
    return <span className={cn("text-[0.72rem]", tenue)}>Instala la app para activarlos</span>;
  if (state === "denied")
    return <span className={cn("text-[0.72rem]", tenue)}>Bloqueados en ajustes</span>;

  const on = state === "on";
  const working = state === "working";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={on ? desactivar : activar}
      disabled={working}
      aria-pressed={on}
      className={cn(
        "border text-[0.84rem]",
        claro
          ? on
            ? "border-transparent bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong"
            : "border-line text-muted hover:bg-surface-2 hover:text-text"
          : on
            ? "border-transparent bg-nav-accent/20 text-nav-accent hover:bg-nav-accent/25 hover:text-nav-accent focus-visible:ring-nav-accent/50"
            : "border-nav-line text-nav-muted hover:bg-nav-active hover:text-nav-text focus-visible:ring-nav-accent/50",
      )}
    >
      {working ? (
        <Spinner weight="bold" className="size-[15px]" aria-hidden />
      ) : on ? (
        <BellRinging size={15} weight="fill" />
      ) : (
        <BellSlash size={15} />
      )}
      {working ? "…" : on ? "Activados" : "Activar"}
    </Button>
  );
}
