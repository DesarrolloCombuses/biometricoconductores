const CACHE_VERSION = "v20260515-007";
const STATIC_CACHE = `combuses-static-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./asistencia-web.html",
  "./asistencia.css?v=20260515-salida",
  "./asistencia.js?v=20260515-salida",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./assets/logo-combuses.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(
      PRECACHE_URLS.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => null)
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("combuses-static-") && k !== STATIC_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok && fresh.type === "basic") {
      cache.put(req, fresh.clone()).catch(() => null);
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: false })
      || await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const fallback = await cache.match("./asistencia-web.html");
      if (fallback) return fallback;
    }
    throw err;
  }
}
