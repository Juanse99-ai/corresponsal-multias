// Service worker del corresponsal.
// Estrategia conservadora para una app de plata:
//  - Estáticos (JS/CSS/fuentes/íconos con hash): cache-first -> carga instantánea
//    y aguanta mala señal.
//  - Páginas y datos: SIEMPRE red (nunca servir saldos/datos viejos). Si no hay
//    conexión, se muestra una página "sin conexión" en vez de números obsoletos.

const STATIC_CACHE = "corr-static-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y externos: sin tocar.

  // Estáticos inmutables: cache-first.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navegaciones (páginas): red; si falla, página offline (sin datos viejos).
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
});
