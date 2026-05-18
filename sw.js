/* ============================================================
   Service Worker — AGENDA CHIARA
   Stratégie : Network-first sans cache HTTP (cache: "no-store")
   pour forcer la MAJ même quand GitHub Pages cache le HTML.
   ============================================================ */

const CACHE_VERSION = "v40";
const CACHE_NAME    = `agenda-cache-${CACHE_VERSION}`;

/* ---- Install : skipWaiting pour activer immédiatement ---- */
self.addEventListener("install", () => {
  self.skipWaiting();
});

/* ---- Activate : supprime les anciens caches et prend le contrôle ---- */
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME)
          .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch : réseau d'abord en ignorant le cache HTTP, fallback cache SW ---- */
self.addEventListener("fetch", evt => {
  if (evt.request.method !== "GET") return;

  evt.respondWith(
    fetch(evt.request, { cache: "no-store" })
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(evt.request))
  );
});
